const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
  "application/xml",
]);

export async function extractTextFromBuffer(
  buffer: ArrayBuffer,
  contentType: string,
  filename: string
): Promise<string> {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const lowerName = filename.toLowerCase();

  if (
    TEXT_TYPES.has(type) ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv")
  ) {
    return new TextDecoder("utf-8", { fatal: false, ignoreBOM: false }).decode(buffer).trim();
  }

  if (type === "application/pdf" || lowerName.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  // Best-effort UTF-8 for unknown types (may be empty for binary)
  const decoded = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false }).decode(buffer).trim();
  if (decoded.length > 80 && /[\x20-\x7E\n]/.test(decoded.slice(0, 200))) {
    return decoded;
  }

  return "";
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n") : String(result.text || "");
    return text.trim();
  } catch {
    return "";
  }
}
