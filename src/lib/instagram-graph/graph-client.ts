import { assertAsciiApiKeyHeaderValue } from "@/lib/http/header-utils"
import { InstagramGraphError } from "@/lib/instagram-graph/errors"
import { getMetaAppConfig } from "@/lib/instagram-graph/meta-config"

type GraphErrorBody = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
  }
}

export class InstagramGraphClient {
  constructor(
    private readonly accessToken: string,
    private readonly graphBaseUrl = getMetaAppConfig().graphBaseUrl
  ) {}

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, params)
  }

  async post<T>(
    path: string,
    params?: Record<string, string | boolean | number>
  ): Promise<T> {
    return this.request<T>("POST", path, params)
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    params?: Record<string, string | boolean | number>
  ): Promise<T> {
    const url = new URL(
      path.startsWith("http") ? path : `${this.graphBaseUrl}${path.startsWith("/") ? path : `/${path}`}`
    )

    const accessToken = assertAsciiApiKeyHeaderValue(this.accessToken, "Instagram access token")

    const bodyParams = new URLSearchParams()
    bodyParams.set("access_token", accessToken)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        bodyParams.set(key, String(value))
      }
    }

    if (method === "GET") {
      for (const [key, value] of bodyParams.entries()) {
        url.searchParams.set(key, value)
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
      body: method === "POST" ? bodyParams.toString() : undefined,
    })

    const data = (await response.json().catch(() => ({}))) as T & GraphErrorBody

    if (!response.ok || data.error) {
      const message = data.error?.message ?? `Graph API HTTP ${response.status}`
      throw new InstagramGraphError(message, response.status, data.error)
    }

    return data
  }
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const { appId, appSecret, graphBaseUrl } = getMetaAppConfig()
  const url = new URL(`${graphBaseUrl}/oauth/access_token`)
  url.searchParams.set("client_id", appId)
  url.searchParams.set("client_secret", appSecret)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("code", code)

  const response = await fetch(url.toString())
  const data = (await response.json()) as {
    access_token?: string
    token_type?: string
    expires_in?: number
    error?: { message?: string }
  }

  if (!response.ok || !data.access_token) {
    throw new InstagramGraphError(
      data.error?.message ?? "OAuth token exchange failed.",
      response.status,
      data.error
    )
  }

  return data
}

export async function exchangeForLongLivedUserToken(shortLivedToken: string) {
  const { appId, appSecret, graphBaseUrl } = getMetaAppConfig()
  const url = new URL(`${graphBaseUrl}/oauth/access_token`)
  url.searchParams.set("grant_type", "fb_exchange_token")
  url.searchParams.set("client_id", appId)
  url.searchParams.set("client_secret", appSecret)
  url.searchParams.set("fb_exchange_token", shortLivedToken)

  const response = await fetch(url.toString())
  const data = (await response.json()) as {
    access_token?: string
    token_type?: string
    expires_in?: number
    error?: { message?: string }
  }

  if (!response.ok || !data.access_token) {
    throw new InstagramGraphError(
      data.error?.message ?? "Long-lived token exchange failed.",
      response.status,
      data.error
    )
  }

  return data
}
