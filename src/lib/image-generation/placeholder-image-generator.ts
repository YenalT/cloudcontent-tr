import type {
  GeneratedVisualAsset,
  ImageGenerationInput,
  ImageGenerationService,
} from "@/lib/image-generation/types"

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function wrapLines(text: string, maxChars: number, maxLines: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
    if (lines.length >= maxLines) break
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines.slice(0, maxLines)
}

function buildPlaceholderSvg(input: ImageGenerationInput): string {
  const { width, height } = input.dimensions
  const variantLabel =
    input.variant === "post"
      ? "Instagram Post"
      : input.variant === "story"
        ? "Instagram Story"
        : `Carousel ${(input.slideIndex ?? 0) + 1}/5`

  const promptLines = wrapLines(input.prompt, 48, input.variant === "story" ? 6 : 4)
  const titleLines = wrapLines(input.label, 36, 2)

  const promptTspans = promptLines
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`
    )
    .join("")

  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : 36}">${escapeXml(line)}</tspan>`
    )
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e3a5f"/>
      <stop offset="100%" style="stop-color:#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="48" y="48" width="${width - 96}" height="${height - 96}" rx="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <text x="80" y="140" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="28" font-weight="600">${escapeXml(variantLabel)}</text>
  <text x="80" y="200" fill="#ffffff" font-family="system-ui, sans-serif" font-size="40" font-weight="700">${titleTspans}</text>
  <text x="80" y="320" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="22">${escapeXml(`${width}×${height} · Placeholder`)}</text>
  <text x="80" y="380" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="20">${promptTspans}</text>
  <text x="80" y="${height - 80}" fill="#64748b" font-family="system-ui, sans-serif" font-size="18">CloudContent TR · AI prompt saved · Replace with image model</text>
</svg>`
}

export class PlaceholderImageGenerationService implements ImageGenerationService {
  async generate(input: ImageGenerationInput): Promise<GeneratedVisualAsset> {
    const svg = buildPlaceholderSvg(input)
    const buffer = Buffer.from(svg, "utf-8")
    const suffix =
      input.variant === "carousel"
        ? `carousel-${(input.slideIndex ?? 0) + 1}`
        : input.variant

    return {
      buffer,
      mimeType: "image/svg+xml",
      fileName: `${suffix}.svg`,
      width: input.dimensions.width,
      height: input.dimensions.height,
      fileSizeBytes: buffer.length,
      detectedMimeType: "image/svg+xml",
    }
  }
}

