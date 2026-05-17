/**
 * Fetch/undici require header values to be ByteString (ISO-8859-1, code points 0–255).
 * Turkish and other Unicode text in headers throws:
 * "Cannot convert argument to a ByteString... character ... greater than 255"
 */

export function findNonLatin1HeaderIndex(value: string): number {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 255) {
      return i
    }
  }
  return -1
}

/** Use before setting any request/response header value that may contain user input. */
export function assertLatin1HeaderValue(headerName: string, value: string): string {
  const index = findNonLatin1HeaderIndex(value)
  if (index >= 0) {
    const code = value.charCodeAt(index)
    throw new Error(
      `HTTP header "${headerName}" contains unsupported character at index ${index} (U+${code.toString(16).toUpperCase()}). Only ISO-8859-1 is allowed in headers.`
    )
  }
  return value
}

/** API keys must be ASCII — Azure/Meta keys are never Unicode. */
export function assertAsciiApiKeyHeaderValue(value: string, label = "API key"): string {
  const trimmed = value.trim()
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i)
    if (code > 127) {
      throw new Error(
        `${label} must use ASCII characters only (invalid at index ${i}, U+${code.toString(16).toUpperCase()}). Check for accidental paste of Turkish text.`
      )
    }
  }
  return trimmed
}

/**
 * Safe Content-Disposition for non-ASCII filenames (RFC 5987).
 */
export function buildContentDispositionInline(fileName: string): string {
  const base = fileName.replace(/[/\\]/g, "_")
  const asciiFallback = base.replace(/[^\x20-\x7E]/g, "_") || "download"
  const encoded = encodeURIComponent(base)
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
}
