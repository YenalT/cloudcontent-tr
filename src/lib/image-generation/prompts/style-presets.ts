export const IMAGE_STYLE_PRESETS = [
  {
    id: "cinematic_tech",
    label: "Cinematic Tech",
    mood: "dramatic, immersive, high-end technology editorial",
    palette: "deep navy, electric cyan, soft purple rim light, white glow accents",
    lighting: "cinematic lighting, volumetric god rays, atmospheric depth",
  },
  {
    id: "modern_saas",
    label: "Modern SaaS",
    mood: "clean, confident, premium software brand aesthetic",
    palette: "cool blue gradients, soft white surfaces, subtle violet accents",
    lighting: "soft studio lighting, crisp highlights, polished reflections",
  },
  {
    id: "futuristic_ai",
    label: "Futuristic AI",
    mood: "visionary, intelligent, next-generation AI infrastructure",
    palette: "neon cyan, holographic purple, dark charcoal, luminous white",
    lighting: "futuristic glow, holographic interfaces, energy particles",
  },
  {
    id: "minimal_enterprise",
    label: "Minimal Enterprise",
    mood: "refined, trustworthy, executive-grade minimalism",
    palette: "navy blue, slate gray, white space, restrained cyan highlights",
    lighting: "even soft light, subtle shadows, premium simplicity",
  },
  {
    id: "cyber_cloud",
    label: "Cyber Cloud",
    mood: "dynamic, networked, cloud-native energy",
    palette: "azure blue, cyber cyan, ultraviolet, dark space backgrounds",
    lighting: "glowing data streams, volumetric fog, digital atmosphere",
  },
  {
    id: "luxury_technology",
    label: "Luxury Technology",
    mood: "exclusive, aspirational, ultra-premium technology art",
    palette: "midnight blue, platinum silver, champagne highlights, subtle magenta",
    lighting: "luxury cinematic lighting, rich contrast, depth of field",
  },
] as const

export type ImageStylePresetId = (typeof IMAGE_STYLE_PRESETS)[number]["id"]

export function getStylePreset(id: string) {
  return IMAGE_STYLE_PRESETS.find((p) => p.id === id) ?? IMAGE_STYLE_PRESETS[0]
}

export function isImageStylePresetId(value: string): value is ImageStylePresetId {
  return IMAGE_STYLE_PRESETS.some((p) => p.id === value)
}
