/** Instagram single-post image constraints (feed square). */

/** OpenAI gpt-image-1 generation size for square posts. */
export const INSTAGRAM_POST_GENERATION_SIZE = 1024

/** Final published dimensions (Instagram-recommended 1:1). */
export const INSTAGRAM_POST_OUTPUT_WIDTH = 1080
export const INSTAGRAM_POST_OUTPUT_HEIGHT = 1080

/** Preferred max file size for fast CDN / Meta fetch. */
export const INSTAGRAM_POST_PREFERRED_MAX_BYTES = 5 * 1024 * 1024

/** Hard limit before rejection (Meta allows larger; we stay conservative). */
export const INSTAGRAM_POST_HARD_MAX_BYTES = 8 * 1024 * 1024

export const INSTAGRAM_POST_MIME = "image/jpeg" as const

export const INSTAGRAM_POST_ASPECT_RATIO = 1
