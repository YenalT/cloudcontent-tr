export type ContentSection = {
  id: string
  content: string
  pageNumber?: number
}

const DEFAULT_MAX_CHARS = 50_000

function tokenizeTopic(topic: string): string[] {
  return topic
    .toLocaleLowerCase("tr-TR")
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
}

function scoreSection(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0
  const haystack = content.toLocaleLowerCase("tr-TR")
  return keywords.reduce((score, keyword) => {
    if (haystack.includes(keyword)) return score + 1
    return score
  }, 0)
}

export function buildSectionsFromExtracted(
  rawContent: string,
  metadata: unknown
): ContentSection[] {
  const meta = metadata as {
    paragraphs?: Array<{ content: string; pageNumber?: number }>
  } | null

  if (meta?.paragraphs?.length) {
    return meta.paragraphs
      .map((p, index) => ({
        id: `p-${index}`,
        content: p.content.trim(),
        pageNumber: p.pageNumber,
      }))
      .filter((s) => s.content.length > 0)
  }

  return rawContent
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 20)
    .map((content, index) => ({ id: `s-${index}`, content }))
}

export function selectRelevantSections(
  sections: ContentSection[],
  topic?: string | null,
  options?: { maxChars?: number }
): { content: string; selectedSectionIds: string[]; usedTopicFilter: boolean } {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS

  if (sections.length === 0) {
    return { content: "", selectedSectionIds: [], usedTopicFilter: false }
  }

  const joinSections = (picked: ContentSection[]) => {
    const parts: string[] = []
    const ids: string[] = []
    let length = 0

    for (const section of picked) {
      const chunk = section.content.trim()
      if (!chunk) continue
      const separator = parts.length > 0 ? "\n\n" : ""
      if (length + separator.length + chunk.length > maxChars) break
      parts.push(chunk)
      ids.push(section.id)
      length += separator.length + chunk.length
    }

    return { content: parts.join("\n\n"), selectedSectionIds: ids }
  }

  if (!topic?.trim()) {
    const joined = joinSections(sections)
    return { ...joined, usedTopicFilter: false }
  }

  const keywords = tokenizeTopic(topic)
  const scored = sections
    .map((section) => ({
      section,
      score: scoreSection(section.content, keywords),
    }))
    .sort((a, b) => b.score - a.score)

  const relevant = scored.filter((s) => s.score > 0).map((s) => s.section)
  const picked =
    relevant.length > 0
      ? relevant
      : scored.slice(0, Math.min(5, scored.length)).map((s) => s.section)

  const joined = joinSections(picked)
  return { ...joined, usedTopicFilter: true }
}

export function prepareDocumentSourceText(
  rawContent: string,
  metadata: unknown,
  topic?: string | null
): string {
  const sections = buildSectionsFromExtracted(rawContent, metadata)
  const { content } = selectRelevantSections(sections, topic)
  return content.trim()
}
