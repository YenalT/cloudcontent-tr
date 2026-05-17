export type VisualTopicCategory = "azure_cloud" | "ai_technology" | "saas_enterprise" | "general_tech"

export type ImagePromptTopicContext = {
  topic: string
  summary: string
  category: VisualTopicCategory
  audience: string
  tags: string[]
}

const AZURE_KEYWORDS = [
  "azure",
  "microsoft",
  "kubernetes",
  "aks",
  "cloud",
  "bulut",
  "devops",
  "fabric",
  "entra",
  "security",
  "güvenlik",
]

const AI_KEYWORDS = [
  "ai",
  "yapay zeka",
  "openai",
  "gpt",
  "llm",
  "machine learning",
  "ml",
  "generative",
  "copilot",
  "agent",
]

const SAAS_KEYWORDS = [
  "saas",
  "enterprise",
  "kurumsal",
  "b2b",
  "platform",
  "dashboard",
  "subscription",
  "software",
  "uygulama",
]

export function inferVisualTopicCategory(input: {
  title: string
  summary?: string | null
  tags?: string[]
  sourceCategory?: string | null
}): VisualTopicCategory {
  const haystack = [
    input.title,
    input.summary ?? "",
    input.sourceCategory ?? "",
    ...(input.tags ?? []),
  ]
    .join(" ")
    .toLowerCase()

  if (AZURE_KEYWORDS.some((k) => haystack.includes(k))) return "azure_cloud"
  if (AI_KEYWORDS.some((k) => haystack.includes(k))) return "ai_technology"
  if (SAAS_KEYWORDS.some((k) => haystack.includes(k))) return "saas_enterprise"
  return "general_tech"
}

export function buildImagePromptTopicContext(input: {
  title: string
  summary?: string | null
  content?: string | null
  tags?: string[]
  sourceCategory?: string | null
  audience?: string
}): ImagePromptTopicContext {
  return {
    topic: input.title.trim(),
    summary: (input.summary ?? input.content?.slice(0, 280) ?? "").trim(),
    category: inferVisualTopicCategory(input),
    audience: input.audience ?? "Turkish B2B technology leaders and enterprise decision makers",
    tags: input.tags ?? [],
  }
}
