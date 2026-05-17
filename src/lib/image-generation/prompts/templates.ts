import { GPT_IMAGE_OPTIMIZATION, IMAGE_NEGATIVE_GUIDANCE } from "@/lib/image-generation/prompts/negative-guidance"
import type { ImageStylePresetId } from "@/lib/image-generation/prompts/style-presets"
import { getStylePreset } from "@/lib/image-generation/prompts/style-presets"
import type { ImagePromptTopicContext, VisualTopicCategory } from "@/lib/image-generation/prompts/topic-context"

type PostTemplateBase = {
  topic: ImagePromptTopicContext
  stylePresetId: ImageStylePresetId
  visualDirection: string
  headlineTurkish: string
  keyPointsTurkish: string[]
}

function styleBlock(presetId: ImageStylePresetId) {
  const preset = getStylePreset(presetId)
  return [
    `Visual style: ${preset.label}`,
    `Mood: ${preset.mood}`,
    `Color palette: ${preset.palette}`,
    `Lighting: ${preset.lighting}`,
  ].join(". ")
}

function categoryAccent(category: VisualTopicCategory) {
  switch (category) {
    case "azure_cloud":
      return [
        "Azure-inspired cloud networking theme: deep azure blue, cyan, purple gradients",
        "Abstract cloud architecture, secure connectivity, enterprise WAN/hybrid cloud atmosphere",
        "Modern data center and network topology mood — NO Microsoft or Azure logos",
      ].join(". ")
    case "ai_technology":
      return [
        "Futuristic AI and intelligent infrastructure theme",
        "Neural network glow, holographic data, premium tech editorial",
      ].join(". ")
    case "saas_enterprise":
      return [
        "Modern B2B SaaS product aesthetic, clean enterprise software mood",
        "Abstract dashboards as shapes only, executive-grade polish",
      ].join(". ")
    default:
      return [
        "Premium enterprise technology infographic aesthetic",
        "Professional Turkish B2B social media educational post",
      ].join(". ")
  }
}

function composePrompt(parts: string[]) {
  return [...parts, GPT_IMAGE_OPTIMIZATION, IMAGE_NEGATIVE_GUIDANCE].join(". ")
}

/**
 * Educational Instagram square post cover — article summary as readable Turkish text on image.
 * Final design target 1080×1080; generated at 1024×1024.
 */
export function buildEducationalPostImagePrompt(base: PostTemplateBase): string {
  const bullets = base.keyPointsTurkish
    .slice(0, 4)
    .map((p, i) => `Bullet ${i + 1} (Turkish): «${p}»`)
    .join(". ")

  return composePrompt([
    "Square Instagram post image, 1:1 aspect ratio, designed for 1080x1080 final export",
    "Educational social media cover that EXPLAINS the article topic — NOT a generic decorative abstract wallpaper",
    "Layout: modern tech infographic / SaaS blog cover style with clear typography hierarchy",
    styleBlock(base.stylePresetId),
    categoryAccent(base.topic.category),
    `Article topic: ${base.topic.topic}`,
    base.topic.summary ? `Article context: ${base.topic.summary}` : "",
    `Turkish headline text on image (large, bold, high contrast): «${base.headlineTurkish}»`,
    bullets,
    [
      "2 to 4 short Turkish bullet points with clean sans-serif typography",
      "Centered composition with generous safe margins (at least 8% padding on all sides)",
      "Keep headline and bullets away from edges — nothing important in outer 10% of frame",
      "High contrast readable text on gradient background",
      "Azure-inspired blue cyan purple color palette, subtle tech patterns in background",
      "Professional B2B Turkish technology brand aesthetic",
      "Semi-realistic 3D tech elements supporting the message, not overwhelming the text",
    ].join(". "),
    `Creative direction: ${base.visualDirection}`,
    [
      "CRITICAL: Render the Turkish headline and bullet text clearly and legibly",
      "Text must be Turkish characters where needed",
      "No fake Microsoft, Azure, or vendor logos",
      "No watermarks, no stock photo clichés, no random English lorem ipsum",
    ].join(". "),
  ])
}
