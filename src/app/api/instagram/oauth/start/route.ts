import { NextResponse } from "next/server"

import { buildOAuthAuthorizationUrl } from "@/lib/instagram-graph/oauth-service"
import { InstagramGraphConfigError } from "@/lib/instagram-graph/errors"
import { isMetaConfigured } from "@/lib/instagram-graph/meta-config"

export async function GET(request: Request) {
  if (!isMetaConfigured()) {
    return NextResponse.json(
      { error: "META_APP_ID ve META_APP_SECRET yapılandırılmamış." },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const returnTo = searchParams.get("returnTo") ?? "/instagram"

  try {
    const url = buildOAuthAuthorizationUrl(returnTo)
    return NextResponse.redirect(url)
  } catch (error) {
    const message =
      error instanceof InstagramGraphConfigError
        ? error.message
        : "OAuth başlatılamadı."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
