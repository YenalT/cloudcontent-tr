/** Single Instagram post payload for Zapier → Instagram publish step. */
export type ZapierInstagramPostPayload = {
  type: "instagram_post"
  socialPostId: string
  articleId: string
  articleTitle: string
  caption: string
  /** Space-separated hashtags with # prefix */
  hashtags: string
  taggedUsers: string[]
  taggedUsersCsv: string
  postImageUrl: string
}

/** @deprecated Legacy payload — use ZapierInstagramPostPayload */
export type ZapierInstagramWebhookPayload = ZapierInstagramPostPayload

export type ZapierTestWebhookPayload = {
  event: "connection_test"
  timestamp: string
  source: "cloudcontent-tr"
}

export type ZapierWebhookRuntimeConfig = {
  webhookUrl: string
  timeoutMs: number
  maxRetries: number
}

export type ZapierWebhookDeliveryResult = {
  success: boolean
  httpStatus?: number
  responseBody?: string
  responseHeaders?: Record<string, string>
  errorMessage?: string
  errorCode?: string
  suggestedAction?: string
  retryCount: number
  durationMs?: number
}
