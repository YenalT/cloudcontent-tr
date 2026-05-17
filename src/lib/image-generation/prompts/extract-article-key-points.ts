import "server-only"

/** Extract 2–4 short Turkish bullet points from article content for image overlay. */
export function extractArticleKeyPoints(input: {
  title: string
  summary?: string | null
  content?: string | null
  maxPoints?: number
}): string[] {
  const maxPoints = input.maxPoints ?? 4
  const source = [input.summary, input.content].filter(Boolean).join("\n")
  if (!source.trim()) {
    return ["Konuyu keşfedin", "Kurumsal teknoloji özeti"]
  }

  const lines = source
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 12 && l.length < 120)

  const bullets = lines.filter((l) => /^[-*•\d.]/.test(l)).map((l) => l.replace(/^[-*•\d.]+\s*/, ""))

  const sentences = source
    .replace(/\n/g, " ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 100)

  const candidates = [...bullets, ...sentences]
  const unique: string[] = []
  for (const c of candidates) {
    const normalized = c.slice(0, 80)
    if (!unique.some((u) => u.toLowerCase() === normalized.toLowerCase())) {
      unique.push(normalized)
    }
    if (unique.length >= maxPoints) break
  }

  if (unique.length < 2) {
    unique.push(`${input.title.slice(0, 60)} — özet`)
    if (input.summary) unique.push(input.summary.slice(0, 80))
  }

  return unique.slice(0, maxPoints)
}
