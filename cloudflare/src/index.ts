import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  AI: any;
  STORAGE?: R2Bucket;
  VECTOR_INDEX?: VectorizeIndex;
  CONVEX_URL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_SA_JSON?: string;
  R2_PUBLIC_URL?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ─── CORS ────────────────────────────────────────────────────────
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Upload-Metadata"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

// ─── HEALTH CHECK ─────────────────────────────────────────────────
app.get("/", (c) => {
  return c.json({
    status: "online",
    service: "EduNexus Cloudflare Worker",
    version: "2.0.0",
    endpoints: [
      "/api/chat",
      "/api/upload-url",
      "/api/upload-proxy/:key",
      "/api/ingest",
      "/api/search",
      "/api/grade-assignment",
      "/api/generate-exam",
      "/api/generate-timetable",
      "/api/generate-learning-path",
    ],
  });
});

// ─── GEMINI API HELPER ───────────────────────────────────────────
async function getAccessToken(env: Env): Promise<string> {
  // If we have a GEMINI_API_KEY, use it directly
  if (env.GEMINI_API_KEY) {
    return env.GEMINI_API_KEY;
  }

  // Otherwise, use service account JSON to get an OAuth2 access token
  if (!env.GEMINI_SA_JSON) {
    throw new Error("Neither GEMINI_API_KEY nor GEMINI_SA_JSON configured");
  }

  let sa: any;
  try {
    sa = JSON.parse(env.GEMINI_SA_JSON);
  } catch {
    throw new Error("GEMINI_SA_JSON is not valid JSON");
  }

  // Create JWT for OAuth2 token exchange
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const claimB64 = btoa(JSON.stringify(claimSet)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const signingInput = `${headerB64}.${claimB64}`;

  // Sign with private key
  const encoder = new TextEncoder();
  const keyData = Uint8Array.from(atob(sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "")), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${signingInput}.${sigB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Token exchange failed: ${tokenRes.status} - ${errText}`);
  }

  const tokenData = await tokenRes.json() as any;
  return tokenData.access_token;
}

async function callGemini(
  env: Env,
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 2048
): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;

  const url = apiKey
    ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // If using service account, get OAuth2 token
  if (!apiKey) {
    const accessToken = await getAccessToken(env);
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const contents: any[] = [];
  if (systemPrompt) {
    contents.push({ role: "user", text: systemPrompt });
    contents.push({ role: "model", text: "Understood. I'll follow those instructions." });
  }
  contents.push({ role: "user", text: prompt });

  const body = {
    contents: contents.map(c => ({
      role: c.role,
      parts: [{ text: c.text }],
    })),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${errText}`);
  }

  const data = (await res.json()) as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── AI CHAT ENDPOINT (Study Buddy) ──────────────────────────────
app.post("/api/chat", async (c) => {
  try {
    const { messages, subjectName } = await c.req.json() as any;

    const systemPrompt = `You are EduBot, a friendly AI study assistant for South African school students (Grade 5-12).
You are multilingual and can respond in English, isiZulu, Sesotho, Afrikaans, Tshivenda, isiXhosa, Sepedi, Setswana, Xitsonga, siSwati, and isiNdebele.
If a student asks in one of these languages, respond in the same language.
Keep explanations clear, age-appropriate, and CAPS-aligned.
${subjectName ? `Current subject: ${subjectName}.` : ""}`;

    const history = (messages || []).slice(-6)
      .map((m: any) => `${m.role === "user" ? "Student" : "EduBot"}: ${m.content}`)
      .join("\n");

    const response = await callGemini(
      c.env,
      `${history}\nEduBot:`,
      systemPrompt,
      1024
    );

    return c.json({ response });
  } catch (error: any) {
    console.error("Chat error:", error.message);
    // Fallback to Workers AI
    try {
      const { messages } = await c.req.json() as any;
      const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          { role: "system", content: "You are EduBot, a helpful AI study buddy for South African school students." },
          ...(messages || []),
        ],
        max_tokens: 1024,
      });
      return c.json({ response: response.response, fallback: true });
    } catch (fallbackErr: any) {
      return c.json({ error: error.message, fallbackError: fallbackErr.message }, 500);
    }
  }
});

// ─── R2: GENERATE UPLOAD URL ─────────────────────────────────────
app.post("/api/upload-url", async (c) => {
  try {
    const { filename, contentType } = await c.req.json() as any;

    if (!c.env.STORAGE) {
      return c.json({ error: "R2 STORAGE binding not configured. Check wrangler.toml." }, 400);
    }

    const ext = filename.split(".").pop() || "";
    const objectKey = `${crypto.randomUUID()}.${ext}`;

    const publicUrl = c.env.R2_PUBLIC_URL || "https://pub-edunexus.r2.dev";

    return c.json({
      uploadUrl: `${new URL(c.req.url).origin}/api/upload-proxy/${objectKey}`,
      fileUrl: `${publicUrl}/${objectKey}`,
      objectKey,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── R2: UPLOAD PROXY ───────────────────────────────────────────
app.put("/api/upload-proxy/:key", async (c) => {
  try {
    const key = c.req.param("key");
    if (!c.env.STORAGE) return c.json({ error: "STORAGE not bound" }, 500);

    const body = await c.req.arrayBuffer();
    const metadataHeader = c.req.header("X-Upload-Metadata");
    const metadata = metadataHeader ? JSON.parse(metadataHeader) : {};

    await c.env.STORAGE.put(key, body, {
      httpMetadata: {
        contentType: metadata.contentType || "application/octet-stream",
      },
      customMetadata: metadata,
    });

    const publicUrl = c.env.R2_PUBLIC_URL || "https://pub-edunexus.r2.dev";
    return c.json({ success: true, key, fileUrl: `${publicUrl}/${key}` });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── R2: INGEST DOCUMENT FOR RAG ─────────────────────────────────
app.post("/api/ingest", async (c) => {
  try {
    const { objectKey, filename, contentType, title, description, text } = await c.req.json() as any;

    // If text is already provided, use it directly (client-side extraction)
    let extractedText = text || "";

    // If no text but we have an R2 object, try to fetch and extract
    if (!extractedText && objectKey && c.env.STORAGE) {
      const object = await c.env.STORAGE.get(objectKey);
      if (object) {
        const bytes = await object.arrayBuffer();
        // For text-based files, attempt to decode
        if (contentType?.includes("text") || filename?.endsWith(".txt") || filename?.endsWith(".md")) {
          extractedText = new TextDecoder().decode(bytes);
        }
      }
    }

    // If we have the AI binding, use it for embeddings
    if (c.env.VECTOR_INDEX && extractedText) {
      try {
        const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
          text: extractedText.slice(0, 8000), // Truncate for embedding
        });

        await c.env.VECTOR_INDEX.upsert([
          {
            id: objectKey,
            values: embedding.data[0],
            metadata: {
              filename,
              title: title || filename,
              description: description || "",
              contentType: contentType || "",
              objectKey,
            },
          },
        ]);
      } catch (embedErr: any) {
        console.warn("Vectorize embedding failed:", embedErr.message);
        // Don't fail the whole request if embedding fails
      }
    }

    return c.json({
      success: true,
      objectKey,
      extractedTextPreview: extractedText.slice(0, 300),
      chunkCount: Math.ceil(extractedText.length / 500),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── AI SEMANTIC SEARCH ──────────────────────────────────────────
app.post("/api/search", async (c) => {
  try {
    const { query, items } = await c.req.json() as any;

    // Use Vectorize if available
    if (c.env.VECTOR_INDEX && query) {
      try {
        const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
          text: query,
        });

        const results = await c.env.VECTOR_INDEX.query(embedding.data[0], {
          topK: 5,
          returnMetadata: true,
        });

        if (results.matches?.length) {
          return c.json({
            ids: results.matches.map((m: any) => m.vector?.metadata?.objectKey || m.id),
            matches: results.matches,
          });
        }
      } catch (vecErr: any) {
        console.warn("Vectorize search failed, falling back to AI:", vecErr.message);
      }
    }

    // Fallback: Use AI to rank items
    const prompt = `You are a search engine for a learning platform. Given a search query and a list of learning materials, return the IDs of the top 3 most relevant items.

Search Query: "${query}"
Items: ${JSON.stringify(items)}

Respond with ONLY a JSON array of IDs, like: ["id1", "id2", "id3"]`;

    const response = await callGemini(c.env, prompt, undefined, 256);
    const startIdx = response.indexOf("[");
    const endIdx = response.lastIndexOf("]");
    if (startIdx === -1 || endIdx === -1) {
      return c.json({ ids: [], raw: response });
    }
    const ids = JSON.parse(response.substring(startIdx, endIdx + 1));
    return c.json({ ids });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── AI HOMEWORK / ASSIGNMENT GRADER ─────────────────────────────
app.post("/api/grade-assignment", async (c) => {
  try {
    const { question, studentAnswer, subjectName, gradeLevel } = await c.req.json() as any;

    const systemPrompt = `You are an experienced South African teacher grading student homework. Be fair, encouraging, and constructive.
${gradeLevel ? `The student is in Grade ${gradeLevel}.` : "The student is in Grade 5-12."}
${subjectName ? `Subject: ${subjectName}.` : ""}

If the question is in a South African language (isiZulu, Sesotho, Afrikaans, etc.), respond in that language.`;

    const prompt = `HOMEWORK QUESTION: ${question}
${studentAnswer ? `STUDENT'S ANSWER: ${studentAnswer}` : "(No answer provided)"}

Please evaluate and provide:
1. A score out of 100 (be fair but thorough)
2. Specific, encouraging feedback explaining what's correct and what needs improvement
3. The correct answer or suggested solution

Respond ONLY in JSON format:
{
  "grade": 85,
  "feedback": "Detailed, encouraging feedback here...",
  "correctAnswer": "The correct answer or full solution here..."
}`;

    const response = await callGemini(c.env, prompt, systemPrompt, 1500);
    const startIdx = response.indexOf("{");
    const endIdx = response.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) {
      return c.json({ error: "AI response not valid JSON", raw: response }, 500);
    }
    const result = JSON.parse(response.substring(startIdx, endIdx + 1));
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── AI EXAM / QUIZ GENERATOR ───────────────────────────────────
app.post("/api/generate-exam", async (c) => {
  try {
    const { topic, subjectName, difficulty, count, language, grade } = await c.req.json() as any;

    const lang = language === "en" ? "English" : language === "af" ? "Afrikaans" : language === "zu" ? "isiZulu" : language === "xh" ? "isiXhosa" : language || "English";

    const systemPrompt = `You are an expert South African CAPS-aligned teacher. Generate a high-quality multiple-choice exam.
All questions, options, and answers MUST be written in ${lang}.
${grade ? `Target Grade: ${grade}` : "Target Grade: 10"}
Difficulty level: ${difficulty || "medium"}`;

    const prompt = `Generate a ${count || 10}-question multiple-choice exam about "${topic}" for ${subjectName || "this subject"}.

RULES:
1. Output ONLY raw JSON — no markdown, no extra text
2. Mix difficulty: 40% easy, 40% medium, 20% hard
3. Each question has exactly 4 options
4. Points per question: 1-5 (harder questions = more points)
5. Write EVERYTHING in ${lang}

JSON FORMAT:
[
  {
    "questionText": "The question in ${lang}",
    "type": "MCQ",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The exact correct option text",
    "points": 2
  }
]`;

    const response = await callGemini(c.env, prompt, systemPrompt, 3000);
    const clean = response.trim();
    const startIdx = clean.indexOf("[");
    const endIdx = clean.lastIndexOf("]");
    if (startIdx === -1 || endIdx === -1) {
      return c.json({ error: "AI response not valid JSON", raw: clean }, 500);
    }
    const questions = JSON.parse(clean.substring(startIdx, endIdx + 1));
    const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
    return c.json({ questions, totalPoints });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── AI TIMETABLE GENERATOR ──────────────────────────────────────
app.post("/api/generate-timetable", async (c) => {
  try {
    const { context, settings } = await c.req.json() as any;

    const systemPrompt = `You are an expert school timetable scheduler following South African school conventions.
School day: Monday to Friday
Include breaks: morning break (30min) and lunch (45min)
No teacher should teach two classes simultaneously.`;

    const prompt = `Generate a weekly timetable for:
- Class: ${context.className}
- School hours: ${settings.startTime} to ${settings.endTime}
- ${settings.periods} periods per day
- Subjects: ${JSON.stringify(context.subjects)}
- Teachers: ${JSON.stringify(context.teachers)}

Output ONLY raw JSON:
{
  "schedule": [
    {
      "day": "Monday",
      "periods": [
        { "subject": "subjectId", "teacher": "teacherId", "startTime": "08:00", "endTime": "08:45", "isBreak": false, "label": "" }
      ]
    }
  ]
}`;

    const response = await callGemini(c.env, prompt, systemPrompt, 3000);
    const clean = response.trim();
    const startIdx = clean.indexOf("{");
    const endIdx = clean.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) {
      return c.json({ error: "AI response not valid JSON", raw: clean }, 500);
    }
    const result = JSON.parse(clean.substring(startIdx, endIdx + 1));
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── AI LEARNING PATH GENERATOR ──────────────────────────────────
app.post("/api/generate-learning-path", async (c) => {
  try {
    const { grade, subjects, weakAreas, academicYear } = await c.req.json() as any;

    const systemPrompt = `You are an expert South African education advisor. Create personalized learning paths for students (Grade 5-12).
Be practical, encouraging, and CAPS-aligned. Include specific study activities.`;

    const prompt = `Create a personalized weekly learning path for:
- Grade: ${grade}
- Subjects: ${JSON.stringify(subjects)}
${weakAreas?.length ? `Areas needing improvement: ${weakAreas.join(", ")}` : ""}
${academicYear ? `Academic year: ${academicYear}` : ""}

Output ONLY raw JSON:
{
  "overview": "Encouraging 2-sentence overview",
  "focusAreas": [
    {
      "topic": "Topic name",
      "reason": "Why this needs focus",
      "activities": ["Specific activity 1", "Specific activity 2", "Specific activity 3"]
    }
  ],
  "weeklySchedule": [
    { "day": "Monday", "tasks": ["Task 1", "Task 2"] }
  ],
  "studyTips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

    const response = await callGemini(c.env, prompt, systemPrompt, 2000);
    const clean = response.trim();
    const startIdx = clean.indexOf("{");
    const endIdx = clean.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) {
      return c.json({ error: "AI response not valid JSON", raw: clean }, 500);
    }
    const result = JSON.parse(clean.substring(startIdx, endIdx + 1));
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── UPSERT VECTOR (for RAG indexing) ────────────────────────────
app.post("/api/vector/upsert", async (c) => {
  try {
    if (!c.env.VECTOR_INDEX) {
      return c.json({ error: "VECTOR_INDEX not configured" }, 400);
    }

    const { id, text, metadata } = await c.req.json() as any;

    const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: text.slice(0, 8000),
    });

    await c.env.VECTOR_INDEX.upsert([
      {
        id,
        values: embedding.data[0],
        metadata: metadata || {},
      },
    ]);

    return c.json({ success: true, id });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── QUERY VECTOR (for RAG search) ───────────────────────────────
app.post("/api/vector/query", async (c) => {
  try {
    if (!c.env.VECTOR_INDEX) {
      return c.json({ error: "VECTOR_INDEX not configured" }, 400);
    }

    const { query, topK = 5, filter } = await c.req.json() as any;

    const embedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", { text: query });

    const results = await c.env.VECTOR_INDEX.query(embedding.data[0], {
      topK,
      returnMetadata: true,
      filter,
    });

    return c.json({ matches: results.matches });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── 404 ─────────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ error: "Not Found", path: c.req.path }, 404);
});

// ─── ERROR HANDLER ───────────────────────────────────────────────
app.onError((err, c) => {
  console.error("Worker error:", err.message);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

export default app;
