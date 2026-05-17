export type AzureOpenAiRuntimeConfig = {
  endpoint: string
  apiKey: string
  deploymentName: string
  apiVersion: string
  temperature: number
  maxTokens: number
  timeoutMs: number
}

export type AzureChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type AzureChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: { message?: string; code?: string }
}
