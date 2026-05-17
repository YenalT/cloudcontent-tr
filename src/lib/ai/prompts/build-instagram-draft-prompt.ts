import { readFileSync } from "fs"
import path from "path"

const DRAFT_PATH = path.join(process.cwd(), "src/lib/ai/prompts/instagram-draft.prompt.md")
const JSON_PATH = path.join(process.cwd(), "src/lib/ai/prompts/instagram-draft-json.prompt.md")
const POST_IMAGE_PATH = path.join(
  process.cwd(),
  "src/lib/ai/prompts/instagram-image-post.prompt.md"
)

export type InstagramDraftPromptInput = {
  articleTitle: string
  articleSummary: string
  articleContent: string
}

export function buildInstagramDraftPrompt(input: InstagramDraftPromptInput): string {
  const template = readFileSync(DRAFT_PATH, "utf-8")
  const jsonInstructions = readFileSync(JSON_PATH, "utf-8")
  const postImageGuide = readFileSync(POST_IMAGE_PATH, "utf-8").replace(
    /\{\{visualDirection\}\}/g,
    "(see visualDirection in output)"
  )

  const contentExcerpt = input.articleContent.slice(0, 6000)

  return template
    .replace(/\{\{articleTitle\}\}/g, input.articleTitle)
    .replace(/\{\{articleSummary\}\}/g, input.articleSummary || "—")
    .replace(/\{\{articleContent\}\}/g, contentExcerpt)
    .concat(
      "\n\n---\n\n",
      jsonInstructions,
      "\n\n---\n\n## Post image prompt reference\n\n",
      postImageGuide
    )
}