/** Appended to every gpt-image-1 prompt (no separate negative prompt API). */
export const IMAGE_NEGATIVE_GUIDANCE = [
  "Avoid: blurry, low detail, soft focus, noise, compression artifacts",
  "Avoid: stock photo look, flat lighting, boring composition, clip art, cheap infographic style",
  "Avoid: ugly typography, readable text, watermarks, logos, Microsoft or Azure brand marks",
  "Avoid: distorted anatomy, extra limbs, deformed faces, messy UI clutter, crowded dashboards",
  "Avoid: oversaturated neon chaos, childish cartoon style, meme aesthetic",
].join(". ")

export const GPT_IMAGE_OPTIMIZATION = [
  "Optimized for OpenAI gpt-image-1, ultra high detail, professional AI artwork quality",
  "Instagram-ready, social-media hero visual, sharp focal subject, rich micro-detail",
  "Semi-realistic to cinematic 3D illustration, modern AI art trend, 8K render quality feel",
].join(". ")
