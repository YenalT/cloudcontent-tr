const OPENAI_HOST_PATTERN = /\.openai\.azure\.com/i
const DOCUMENT_INTELLIGENCE_PATH_PATTERN = /\/documentintelligence\b/i

export function normalizeDocumentIntelligenceEndpoint(raw: string): string {
  return raw.trim().replace(/\/+$/, "")
}

export type DocumentIntelligenceEndpointValidation =
  | { ok: true; normalized: string }
  | { ok: false; message: string }

/**
 * Validates and normalizes the Document Intelligence resource root URL.
 * Rejects Azure OpenAI endpoints and URLs that already include API path segments.
 */
export function validateDocumentIntelligenceEndpoint(
  raw: string
): DocumentIntelligenceEndpointValidation {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, message: "Endpoint gerekli." }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, message: "Geçerli bir HTTPS endpoint girin." }
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, message: "Endpoint https:// ile başlamalı." }
  }

  if (OPENAI_HOST_PATTERN.test(parsed.hostname)) {
    return {
      ok: false,
      message:
        "Bu adres bir Azure OpenAI endpoint’i. Document Intelligence için Azure portal’daki “Keys and Endpoint” değerini kullanın (genelde *.cognitiveservices.azure.com).",
    }
  }

  const normalized = normalizeDocumentIntelligenceEndpoint(trimmed)

  if (DOCUMENT_INTELLIGENCE_PATH_PATTERN.test(normalized)) {
    return {
      ok: false,
      message:
        "Endpoint yalnızca kaynak kök URL’si olmalıdır (ör. https://your-resource.cognitiveservices.azure.com). /documentintelligence yolunu eklemeyin.",
    }
  }

  return { ok: true, normalized }
}
