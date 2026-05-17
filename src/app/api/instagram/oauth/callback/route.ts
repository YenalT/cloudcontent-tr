import { NextResponse } from "next/server"

import {
  completeInstagramOAuth,
  decodeOAuthState,
} from "@/lib/instagram-graph/oauth-service"
import { getAppOrigin } from "@/lib/instagram-graph/meta-config"
import { isInstagramGraphError } from "@/lib/instagram-graph/errors"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  const statePayload = state ? decodeOAuthState(state) : null
  const returnTo = statePayload?.returnTo ?? "/instagram"
  const origin = getAppOrigin()

  function redirect(params: Record<string, string>) {
    const url = new URL(returnTo.startsWith("/") ? returnTo : `/${returnTo}`, origin)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
    return NextResponse.redirect(url.toString())
  }

  if (error) {
    return redirect({
      error: errorDescription ?? error ?? "Facebook OAuth iptal edildi.",
    })
  }

  if (!code) {
    return redirect({ error: "OAuth kodu alınamadı." })
  }

  try {
    const result = await completeInstagramOAuth(code)
    return redirect({
      connected: `Instagram hesabı bağlandı: @${result.username}`,
    })
  } catch (err) {
    const message = isInstagramGraphError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : "Instagram bağlantısı tamamlanamadı."
    return redirect({ error: message })
  }
}
