import { InstagramGraphConfigError } from "@/lib/instagram-graph/errors"

export const INSTAGRAM_OAUTH_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
] as const

export function getMetaAppConfig() {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v21.0"

  if (!appId?.trim() || !appSecret?.trim()) {
    throw new InstagramGraphConfigError(
      "META_APP_ID ve META_APP_SECRET ortam değişkenleri yapılandırılmalı."
    )
  }

  return {
    appId: appId.trim(),
    appSecret: appSecret.trim(),
    graphVersion,
    graphBaseUrl: `https://graph.facebook.com/${graphVersion}`,
    oauthDialogUrl: `https://www.facebook.com/${graphVersion}/dialog/oauth`,
  }
}

export function getOAuthRedirectUri() {
  const explicit = process.env.META_OAUTH_REDIRECT_URI?.trim()
  if (explicit) return explicit

  const appUrl = process.env.APP_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!appUrl) {
    throw new InstagramGraphConfigError(
      "META_OAUTH_REDIRECT_URI veya APP_URL tanımlanmalı (ör. https://localhost:3000)."
    )
  }
  return `${appUrl.replace(/\/+$/, "")}/api/instagram/oauth/callback`
}

/** Public base URL for image_url fields required by Instagram Graph API. */
export function getPublicAppUrl() {
  const url =
    process.env.APP_PUBLIC_URL?.trim() ??
    process.env.APP_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!url) {
    throw new InstagramGraphConfigError(
      "Yayın için APP_PUBLIC_URL tanımlanmalı (Meta'nın erişebileceği HTTPS adres, örn. ngrok)."
    )
  }
  return url.replace(/\/+$/, "")
}

export function isMetaConfigured() {
  return Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim())
}

export function getAppOrigin() {
  const appUrl =
    process.env.APP_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "http://localhost:3000"
  return appUrl.replace(/\/+$/, "")
}
