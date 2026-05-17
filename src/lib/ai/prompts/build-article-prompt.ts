import { readFileSync } from "fs"
import path from "path"

import type { ArticleGenerationInput } from "@/lib/ai/types"

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "src/lib/ai/prompts/article-generation.prompt.md"
)
const JSON_TEMPLATE_PATH = path.join(
  process.cwd(),
  "src/lib/ai/prompts/article-generation-json.prompt.md"
)

export function buildArticleGenerationPrompt(input: ArticleGenerationInput): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8")
  const jsonInstructions = readFileSync(JSON_TEMPLATE_PATH, "utf-8")

  const sourceTypeLabel = input.sourceType === "url" ? "URL / Web" : "Uploaded document"

  return template
    .replace(/\{\{targetLanguage\}\}/g, input.targetLanguage)
    .replace(/\{\{sourceType\}\}/g, sourceTypeLabel)
    .replace(/\{\{topic\}\}/g, input.topic)
    .replace(/\{\{sourceContent\}\}/g, input.sourceContent.trim())
    .concat("\n\n---\n\n", jsonInstructions)
}
