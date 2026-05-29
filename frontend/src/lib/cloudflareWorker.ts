export const CLOUDFLARE_WORKER_URL =
  import.meta.env.VITE_CLOUDFLARE_WORKER_URL || "https://edunexus-ai.edusqwizooor.workers.dev";

export interface UploadResult {
  fileUrl: string;
  objectKey: string;
  contentType: string;
}

export interface IngestPayload {
  objectKey: string;
  filename: string;
  contentType: string;
  subjectId: string;
  materialId: string;
  title: string;
  description?: string;
}

export async function ingestMaterial(payload: IngestPayload): Promise<{
  extractedTextPreview: string;
  chunkCount: number;
}> {
  const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to index material for semantic search.");
  }

  const data = await res.json();
  return {
    extractedTextPreview: data.extractedTextPreview || "",
    chunkCount: data.chunkCount || 0,
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithEduBot(
  messages: ChatMessage[],
  subjectName?: string
): Promise<string> {
  const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, subjectName }),
  });

  if (!res.ok) {
    throw new Error("Failed to chat with EduBot. Is the Cloudflare Worker running?");
  }

  const data = await res.json();
  return data.response;
}

export async function gradeHomeworkWithAI(payload: {
  question: string;
  studentAnswer?: string;
  subjectName?: string;
  gradeLevel?: number;
}): Promise<{ grade: number; feedback: string; correctAnswer?: string }> {
  const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/grade-assignment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to grade homework.");
  }

  return res.json();
}

export async function searchMaterials(query: string, items: any[]): Promise<string[]> {
  const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, items }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.ids || [];
}
