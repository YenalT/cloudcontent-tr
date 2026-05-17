import { ApiUsageStatus } from "@prisma/client"

import { AzureOpenAiError } from "@/lib/ai/errors"
import type {
  AzureChatCompletionResponse,
  AzureChatMessage,
  AzureOpenAiRuntimeConfig,
} from "@/lib/ai/azure-openai-types"
import { assertAsciiApiKeyHeaderValue } from "@/lib/http/header-utils"
import { prisma } from "@/lib/prisma"

export type AzureChatRequest = {
  messages: AzureChatMessage[]
  responseFormatJson?: boolean
  purpose: string
}

export type AzureChatResult = {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.replace(/\/+$/, "")
}

export class AzureOpenAiClient {
  constructor(private readonly config: AzureOpenAiRuntimeConfig) {}

  async chat(request: AzureChatRequest): Promise<AzureChatResult> {
    const url = `${normalizeEndpoint(this.config.endpoint)}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${encodeURIComponent(this.config.apiVersion)}`

    const body = {
      messages: request.messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      ...(request.responseFormatJson ? { response_format: { type: "json_object" } } : {}),
    }

    const started = Date.now()
    let status: ApiUsageStatus = ApiUsageStatus.FAILED
    let inputTokens = 0
    let outputTokens = 0
    let totalTokens = 0
    let errorMessage: string | undefined

    try {
      const apiKey = assertAsciiApiKeyHeaderValue(this.config.apiKey, "Azure OpenAI API key")

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      })

      const data = (await response.json()) as AzureChatCompletionResponse

      if (!response.ok) {
        const msg = data.error?.message ?? `Azure OpenAI HTTP ${response.status}`
        throw new AzureOpenAiError(msg, response.status)
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new AzureOpenAiError("Azure OpenAI yanıtında içerik bulunamadı.")
      }

      inputTokens = data.usage?.prompt_tokens ?? 0
      outputTokens = data.usage?.completion_tokens ?? 0
      totalTokens = data.usage?.total_tokens ?? inputTokens + outputTokens
      status = ApiUsageStatus.SUCCESS

      return { content, usage: { inputTokens, outputTokens, totalTokens } }
    } catch (error) {
      if (error instanceof Error && error.message.includes("ASCII")) {
        throw new AzureOpenAiError(error.message)
      }
      if (error instanceof AzureOpenAiError) {
        errorMessage = error.message
        throw error
      }
      if (error instanceof Error && error.name === "TimeoutError") {
        errorMessage = `İstek zaman aşımına uğradı (${this.config.timeoutMs}ms).`
        throw new AzureOpenAiError(errorMessage)
      }
      errorMessage = error instanceof Error ? error.message : "Azure OpenAI isteği başarısız."
      throw new AzureOpenAiError(errorMessage)
    } finally {
      const durationMs = Date.now() - started
      await prisma.apiUsageLog
        .create({
          data: {
            provider: "azure-openai",
            endpoint: "/chat/completions",
            model: this.config.deploymentName,
            inputTokens: inputTokens || undefined,
            outputTokens: outputTokens || undefined,
            totalTokens: totalTokens || undefined,
            status,
            metadata: {
              purpose: request.purpose,
              durationMs,
              apiVersion: this.config.apiVersion,
              error: errorMessage,
            },
          },
        })
        .catch(() => null)
    }
  }
}

export async function testAzureOpenAiConnection(
  config: AzureOpenAiRuntimeConfig
): Promise<{ ok: true; message: string; latencyMs: number }> {
  const client = new AzureOpenAiClient(config)
  const started = Date.now()
  await client.chat({
    purpose: "connection_test",
    responseFormatJson: false,
    messages: [
      {
        role: "user",
        content: 'Reply with exactly: {"status":"ok"}',
      },
    ],
  })
  return {
    ok: true,
    message: "Azure OpenAI bağlantısı başarılı.",
    latencyMs: Date.now() - started,
  }
}
