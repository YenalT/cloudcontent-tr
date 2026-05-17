import { randomBytes } from "crypto"

import { InstagramAccountType } from "@prisma/client"

import { encryptSecret } from "@/lib/crypto/encryption"
import { prisma } from "@/lib/prisma"
import {
  exchangeCodeForToken,
  exchangeForLongLivedUserToken,
  InstagramGraphClient,
} from "@/lib/instagram-graph/graph-client"
import { InstagramGraphError } from "@/lib/instagram-graph/errors"
import {
  getMetaAppConfig,
  getOAuthRedirectUri,
  INSTAGRAM_OAUTH_SCOPES,
} from "@/lib/instagram-graph/meta-config"

export type OAuthStatePayload = {
  nonce: string
  returnTo: string
}

export function encodeOAuthState(payload: OAuthStatePayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

export function decodeOAuthState(state: string): OAuthStatePayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as OAuthStatePayload
    if (!parsed.nonce || !parsed.returnTo) return null
    return parsed
  } catch {
    return null
  }
}

export function buildOAuthAuthorizationUrl(returnTo = "/instagram") {
  const { appId, oauthDialogUrl } = getMetaAppConfig()
  const redirectUri = getOAuthRedirectUri()
  const state = encodeOAuthState({
    nonce: randomBytes(16).toString("hex"),
    returnTo,
  })

  const url = new URL(oauthDialogUrl)
  url.searchParams.set("client_id", appId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", INSTAGRAM_OAUTH_SCOPES.join(","))
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)

  return url.toString()
}

type FacebookPageWithIg = {
  id: string
  name: string
  access_token: string
  instagram_business_account?: {
    id: string
    username?: string
    profile_picture_url?: string
  }
}

type PagesResponse = {
  data: FacebookPageWithIg[]
}

export async function completeInstagramOAuth(code: string) {
  const redirectUri = getOAuthRedirectUri()
  const short = await exchangeCodeForToken(code, redirectUri)
  const long = await exchangeForLongLivedUserToken(short.access_token!)

  const userToken = long.access_token ?? short.access_token!
  const userClient = new InstagramGraphClient(userToken)
  const pages = await userClient.get<PagesResponse>(
    "/me/accounts",
    {
      fields:
        "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
    }
  )

  const pageWithIg = pages.data?.find((p) => p.instagram_business_account?.id)
  if (!pageWithIg?.instagram_business_account) {
    throw new InstagramGraphError(
      "Bağlı Facebook sayfasında Instagram Business veya Creator hesabı bulunamadı. Lütfen Meta Business Suite üzerinden hesabı bağlayın."
    )
  }

  const ig = pageWithIg.instagram_business_account
  const encrypted = encryptSecret(pageWithIg.access_token)
  const tokenExpiresAt =
    long.expires_in != null
      ? new Date(Date.now() + long.expires_in * 1000)
      : short.expires_in != null
        ? new Date(Date.now() + short.expires_in * 1000)
        : null

  const username = ig.username ?? pageWithIg.name
  const accountType = InstagramAccountType.BUSINESS

  await prisma.$transaction(async (tx) => {
    await tx.instagramAccount.updateMany({ data: { isActive: false } })

    await tx.instagramAccount.upsert({
      where: { instagramBusinessAccountId: ig.id },
      create: {
        username,
        displayName: pageWithIg.name,
        accountType,
        instagramBusinessAccountId: ig.id,
        facebookPageId: pageWithIg.id,
        facebookPageName: pageWithIg.name,
        accessTokenCiphertext: encrypted.ciphertext,
        accessTokenIv: encrypted.iv,
        accessTokenAuthTag: encrypted.authTag,
        tokenExpiresAt,
        scopes: [...INSTAGRAM_OAUTH_SCOPES],
        connectionMetadata: {
          profilePictureUrl: ig.profile_picture_url ?? null,
          facebookPageId: pageWithIg.id,
          connectedVia: "facebook_oauth",
        },
        isActive: true,
        connectedAt: new Date(),
      },
      update: {
        username,
        displayName: pageWithIg.name,
        facebookPageId: pageWithIg.id,
        facebookPageName: pageWithIg.name,
        accessTokenCiphertext: encrypted.ciphertext,
        accessTokenIv: encrypted.iv,
        accessTokenAuthTag: encrypted.authTag,
        tokenExpiresAt,
        scopes: [...INSTAGRAM_OAUTH_SCOPES],
        connectionMetadata: {
          profilePictureUrl: ig.profile_picture_url ?? null,
          facebookPageId: pageWithIg.id,
          connectedVia: "facebook_oauth",
        },
        isActive: true,
        connectedAt: new Date(),
      },
    })
  })

  return { username, instagramBusinessAccountId: ig.id }
}
