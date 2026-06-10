import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, UploadMetadata } from "./env";
import { deleteVectorsForMaterial, ingestR2Object } from "./lib/ingest";
import { buildRagContext, searchMaterials } from "./lib/rag";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

type CloudflareApiResponse<T> = {
  success: boolean;
  result?: T;
  errors?: { message?: string }[];
};

function publicFileUrl(env: Env, objectKey: string, host: string): string {
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`;
  }
  return `https://${host}/api/files/${encodeURIComponent(objectKey)}`;
}

function parseUploadMetadataHeader(raw: string | undefined): Partial<UploadMetadata> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<UploadMetadata>;
  } catch {
    return {};
  }
}

app.get("/", (c) => {
  return c.text("EduNexus AI & Storage Worker is online.");
});

// Serve R2 objects when no public bucket domain is configured (dev)
app.get("/api/files/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  if (!c.env.STORAGE) return c.json({ error: "STORAGE not bound" }, 500);

  const object = await c.env.STORAGE.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
});

// AI Chat with Vectorize RAG
app.post("/api/chat", async (c) => {
  try {
    const { messages, subjectId } = await c.req.json();
    const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");

    let ragContext = "";
    if (lastUser?.content && c.env.VECTOR_INDEX) {
      try {
        const matches = await searchMaterials(c.env, lastUser.content, {
          subjectId,
          topK: 5,
        });
        ragContext = buildRagContext(matches);
      } catch (ragError) {
        console.warn("Vectorize search skipped:", ragError);
      }
    }

    const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [
        {
          role: "system",
          content: `You are EduBot, a helpful AI study buddy for South African school students (Grade 5 to 12). Use the provided study material excerpts when relevant.${ragContext}`,
        },
        ...messages,
      ],
      max_tokens: 1024,
    });

    return c.json({ response: response.response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/api/generate-path", async (c) => {
  try {
    const prompt = `You are an expert educator. Generate a personalized, weekly learning path for a student.
Identify 3 key focus areas and suggest actionable study activities.
Return the result STRICTLY as a raw JSON string. Do not include markdown code blocks.

Schema:
{
  "overview": "Short encouraging message",
  "focusAreas": [
    { "topic": "Name of topic", "reason": "Why focus here", "activities": ["Activity 1", "Activity 2"] }
  ]
}`;

    const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    });

    return c.json({ response: response.response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate path";
    return c.json({ error: message }, 500);
  }
});

// Step 1: Client requests upload target (R2 via worker proxy)
app.post("/api/upload-url", async (c) => {
  try {
    const body = await c.req.json();
    const { filename, contentType } = body;

    if (!filename) {
      return c.json({ error: "filename is required" }, 400);
    }
    if (!c.env.STORAGE) {
      return c.json({ error: "R2 STORAGE binding is not configured." }, 400);
    }

    const objectKey = `${crypto.randomUUID()}-${filename}`;
    const host = c.req.header("host") || "localhost";

    return c.json({
      objectKey,
      uploadUrl: `https://${host}/api/upload-proxy/${encodeURIComponent(objectKey)}`,
      fileUrl: publicFileUrl(c.env, objectKey, host),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create upload URL";
    return c.json({ error: message }, 500);
  }
});

app.post("/api/stream/direct-upload", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const maxDurationSeconds = Number(body.maxDurationSeconds || 7200);
    const creator = body.creator || "edunexus";

    if (c.env.STREAM) {
      const directUpload = await c.env.STREAM.createDirectUpload({
        maxDurationSeconds,
        meta: {
          name: body.name || "EduNexus lesson recording",
          creator,
          source: "edunexus-live-class",
        },
      });
      return c.json(directUpload);
    }

    if (!c.env.CLOUDFLARE_ACCOUNT_ID || !c.env.CLOUDFLARE_API_TOKEN) {
      return c.json({ error: "Cloudflare Stream is not configured." }, 400);
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds,
          meta: {
            name: body.name || "EduNexus lesson recording",
            creator,
            source: "edunexus-live-class",
          },
        }),
      }
    );

    const data = await response.json() as CloudflareApiResponse<{ uid: string; uploadURL: string }>;
    if (!response.ok || !data.success) {
      return c.json({ error: data.errors?.[0]?.message || "Failed to create Stream upload." }, 500);
    }

    return c.json(data.result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create Stream upload.";
    return c.json({ error: message }, 500);
  }
});

app.post("/api/live/create-input", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = body.title || body.name || "EduNexus live class";
    const preferLowLatency = body.preferLowLatency ?? true;

    if (!c.env.CLOUDFLARE_ACCOUNT_ID || !c.env.CLOUDFLARE_API_TOKEN) {
      return c.json({ error: "Cloudflare Stream Live is not configured." }, 400);
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meta: {
            name,
            source: "edunexus-live-class",
          },
          recording: {
            mode: "automatic",
            requireSignedURLs: false,
            hideLiveViewerCount: false,
          },
          preferLowLatency,
          timeoutSeconds: 10,
        }),
      }
    );

    const data = await response.json() as CloudflareApiResponse<{
      uid: string;
      rtmps?: { url?: string; streamKey?: string };
      srt?: { url?: string; streamId?: string; passphrase?: string };
    }>;

    if (!response.ok || !data.success || !data.result) {
      return c.json({ error: data.errors?.[0]?.message || "Failed to create Stream live input." }, 500);
    }

    const uid = data.result.uid;
    return c.json({
      uid,
      rtmpsUrl: data.result.rtmps?.url,
      streamKey: data.result.rtmps?.streamKey,
      srtUrl: data.result.srt?.url,
      srtStreamId: data.result.srt?.streamId,
      srtPassphrase: data.result.srt?.passphrase,
      playbackUrl: `https://videodelivery.net/${uid}/manifest/video.m3u8`,
      iframeUrl: `https://iframe.videodelivery.net/${uid}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create Stream live input.";
    return c.json({ error: message }, 500);
  }
});

app.get("/api/stream/video/:uid", async (c) => {
  try {
    const uid = c.req.param("uid");
    if (!c.env.CLOUDFLARE_ACCOUNT_ID || !c.env.CLOUDFLARE_API_TOKEN) {
      return c.json({
        uid,
        iframeUrl: `https://iframe.videodelivery.net/${uid}`,
        thumbnailUrl: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
        status: "unknown",
      });
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
      { headers: { Authorization: `Bearer ${c.env.CLOUDFLARE_API_TOKEN}` } }
    );
    const data = await response.json() as CloudflareApiResponse<{
      duration?: number;
      thumbnail?: string;
      playback?: unknown;
      status?: { state?: string };
    }>;
    if (!response.ok || !data.success) {
      return c.json({ error: data.errors?.[0]?.message || "Failed to fetch Stream video." }, 500);
    }

    return c.json({
      uid,
      status: data.result?.status?.state,
      duration: data.result?.duration,
      iframeUrl: `https://iframe.videodelivery.net/${uid}`,
      thumbnailUrl: data.result?.thumbnail || `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      playback: data.result?.playback,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch Stream video.";
    return c.json({ error: message }, 500);
  }
});

app.post("/api/mark-scanned-work", async (c) => {
  try {
    const { title, subjectName, gradeLevel, questionText, memoText, studentText, rubric } = await c.req.json();

    const prompt = `You are an experienced South African CAPS teacher and marker.
Mark the learner's scanned or uploaded work professionally.

Assessment: ${title || "Untitled task"}
Subject: ${subjectName || "General"}
Grade: ${gradeLevel || "Not specified"}

Question paper / instructions:
${questionText || "Not provided"}

Teacher memo / expected answer:
${memoText || "No memo provided. Infer a fair rubric from the question."}

Rubric:
${rubric || "Use accuracy, reasoning, evidence, structure, and clarity."}

Learner answer:
${studentText || "No answer text provided"}

Return ONLY JSON:
{
  "mark": number,
  "maxMark": number,
  "percentage": number,
  "level": "Needs support | Developing | Proficient | Excellent",
  "feedback": "Short learner-friendly feedback",
  "teacherNotes": "Specific notes for the teacher",
  "corrections": ["correction 1", "correction 2"],
  "rubricBreakdown": [{"criterion":"string","mark":number,"comment":"string"}]
}`;

    const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
    });

    const content = String(response.response || "").trim();
    const startIdx = content.indexOf("{");
    const endIdx = content.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) {
      return c.json({ error: "AI marker did not return valid JSON.", rawResponse: content }, 500);
    }

    return c.json(JSON.parse(content.substring(startIdx, endIdx + 1)));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to mark scanned work.";
    return c.json({ error: message }, 500);
  }
});

// Step 2: Upload bytes to R2; Step 3–5: process + embed + Vectorize (async)
app.put("/api/upload-proxy/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  if (!c.env.STORAGE) return c.json({ error: "STORAGE not bound" }, 500);

  const headerMeta = parseUploadMetadataHeader(c.req.header("X-Upload-Metadata"));
  const contentType =
    c.req.header("Content-Type") || headerMeta.contentType || "application/octet-stream";

  const meta: UploadMetadata = {
    filename: headerMeta.filename || key,
    contentType,
    subjectId: headerMeta.subjectId,
    materialId: headerMeta.materialId,
    title: headerMeta.title,
    description: headerMeta.description,
  };

  await c.env.STORAGE.put(key, c.req.raw.body, {
    httpMetadata: { contentType },
    customMetadata: {
      filename: meta.filename,
      contentType: meta.contentType,
      subjectId: meta.subjectId || "",
      materialId: meta.materialId || "",
      title: meta.title || "",
      description: meta.description || "",
    },
  });

  if (c.env.VECTOR_INDEX && (meta.subjectId || meta.title)) {
    c.executionCtx.waitUntil(
      ingestR2Object(c.env, key, meta).catch((err) => {
        console.error("Background ingest failed:", err);
      })
    );
  }

  return c.json({ success: true, key, fileUrl: publicFileUrl(c.env, key, c.req.header("host") || "localhost") });
});

// Explicit ingest / re-index after Convex material is created
app.post("/api/ingest", async (c) => {
  try {
    const body = await c.req.json();
    const { objectKey, filename, contentType, subjectId, materialId, title, description } =
      body;

    if (!objectKey) {
      return c.json({ error: "objectKey is required" }, 400);
    }
    if (!c.env.STORAGE || !c.env.VECTOR_INDEX) {
      return c.json({ error: "STORAGE and VECTOR_INDEX must be configured." }, 400);
    }

    const meta: UploadMetadata = {
      filename: filename || objectKey,
      contentType: contentType || "application/octet-stream",
      subjectId,
      materialId,
      title,
      description,
    };

    await deleteVectorsForMaterial(c.env, objectKey, materialId);
    const result = await ingestR2Object(c.env, objectKey, meta);

    return c.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return c.json({ error: message }, 500);
  }
});

// Semantic search over ingested materials
app.post("/api/material-search", async (c) => {
  try {
    const { query, subjectId, topK } = await c.req.json();
    if (!query) return c.json({ error: "query is required" }, 400);

    const matches = await searchMaterials(c.env, query, { subjectId, topK });
    return c.json({ matches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/api/search", async (c) => {
  try {
    const { query, items } = await c.req.json();

    const prompt = `You are an AI search assistant. Given a user search query and a list of items (materials, subjects, announcements), identify the top 3 most relevant items.
    
Query: "${query}"
Items: ${JSON.stringify(items)}

Return the result STRICTLY as a JSON array of the IDs of the top 3 most relevant items.
Example: ["id1", "id2", "id3"]`;

    const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
    });

    const content = String(response.response || "");
    const startIdx = content.indexOf("[");
    const endIdx = content.lastIndexOf("]");
    const ids = JSON.parse(content.substring(startIdx, endIdx + 1));

    return c.json({ ids });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/api/grade-assignment", async (c) => {
  try {
    const { submission, assignment } = await c.req.json();

    const prompt = `You are a teacher grading a student assignment.
Assignment Title: ${assignment.title}
Instructions: ${assignment.description}
Student Submission: ${submission.content}

Grade the student out of ${assignment.maxPoints || 100}.
Provide short constructive feedback.
Return as JSON: { "grade": number, "feedback": "string" }`;

    const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    });

    const content = String(response.response || "");
    const startIdx = content.indexOf("{");
    const endIdx = content.lastIndexOf("}");
    const result = JSON.parse(content.substring(startIdx, endIdx + 1));

    return c.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Grading failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/api/generate-exam", async (c) => {
  try {
    const { topic, subjectName, difficulty, count } = await c.req.json();

    const prompt = `
      You are an expert South African teacher creating a multiple-choice exam.
      
      CONTEXT:
      - Subject: ${subjectName}
      - Topic: ${topic}
      - Difficulty/Grade Level: ${difficulty}
      - Total Questions: ${count}

      STRICT JSON SCHEMA (Array of Objects):
      [
        {
          "questionText": "Question string",
          "type": "MCQ",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The exact string of the correct option",
          "points": 1
        }
      ]

      RULES:
      1. Output ONLY raw JSON. No conversational text or markdown.
      2. Ensure correct answer matches one of the options exactly.
      3. Tailor questions to the specified difficulty/grade level.
    `;

    const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
    });

    let content = String(response.response || "").trim();
    const startIdx = content.indexOf("[");
    const endIdx = content.lastIndexOf("]");

    if (startIdx === -1 || endIdx === -1) {
      return c.json({ error: "AI failed to generate a valid JSON array.", rawResponse: content }, 500);
    }

    content = content.substring(startIdx, endIdx + 1);
    return c.json({ questions: JSON.parse(content) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Exam generation failed";
    return c.json({ error: message }, 500);
  }
});

app.post("/api/generate-timetable", async (c) => {
  try {
    const { context, settings } = await c.req.json();

    const prompt = `
      You are a school scheduler. Generate a weekly timetable (Monday to Friday) as a JSON object.
      
      CONTEXT:
      - Class: ${context.className}
      - Hours: ${settings.startTime} to ${settings.endTime} (${settings.periods} periods/day).
      - Subjects: ${JSON.stringify(context.subjects)}
      - Teachers: ${JSON.stringify(context.teachers)}
      
      STRICT RULES:
      1. Assign a Teacher to every Subject period.
      2. Output ONLY raw JSON matching this schema:
         { "schedule": [ { "day": "Monday", "periods": [ { "subject": "ID", "teacher": "ID", "startTime": "HH:MM", "endTime": "HH:MM" } ] } ] }
      3. No conversational text or markdown.
    `;

    const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2560,
    });

    let content = String(response.response || "").trim();
    const startIdx = content.indexOf("{");
    const endIdx = content.lastIndexOf("}");

    if (startIdx === -1 || endIdx === -1) {
      return c.json({ error: "AI failed to generate a valid JSON timetable.", rawResponse: content }, 500);
    }

    content = content.substring(startIdx, endIdx + 1);
    return c.json(JSON.parse(content));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Timetable generation failed";
    return c.json({ error: message }, 500);
  }
});

export default app;
