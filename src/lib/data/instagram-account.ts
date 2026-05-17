import { decryptSecret, maskApiKey } from "@/lib/crypto/encryption"
import { prisma } from "@/lib/prisma"

export type InstagramAccountPublic = {
  id: string
  username: string
  displayName: string | null
  accountType: string
  instagramBusinessAccountId: string
  facebookPageId: string
  facebookPageName: string | null
  isActive: boolean
  connectedAt: string
  tokenExpiresAt: string | null
  hasToken: boolean
  tokenMasked: string | null
  scopes: string[]
  profilePictureUrl: string | null
}

function profilePictureFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const pic = (metadata as { profilePictureUrl?: string }).profilePictureUrl
  return typeof pic === "string" ? pic : null
}

export async function getActiveInstagramAccountPublic(): Promise<InstagramAccountPublic | null> {
  const row = await prisma.instagramAccount.findFirst({
    where: { isActive: true },
    orderBy: { connectedAt: "desc" },
  })
  if (!row) return null
  return toPublic(row)
}

export async function getInstagramAccountsPublic(): Promise<InstagramAccountPublic[]> {
  const rows = await prisma.instagramAccount.findMany({
    orderBy: { connectedAt: "desc" },
  })
  return rows.map(toPublic)
}

function toPublic(row: {
  id: string
  username: string
  displayName: string | null
  accountType: string
  instagramBusinessAccountId: string
  facebookPageId: string
  facebookPageName: string | null
  isActive: boolean
  connectedAt: Date
  tokenExpiresAt: Date | null
  accessTokenCiphertext: string
  accessTokenIv: string
  accessTokenAuthTag: string
  scopes: string[]
  connectionMetadata: unknown
}): InstagramAccountPublic {
  let tokenMasked: string | null = null
  try {
    const token = decryptSecret({
      ciphertext: row.accessTokenCiphertext,
      iv: row.accessTokenIv,
      authTag: row.accessTokenAuthTag,
    })
    tokenMasked = maskApiKey(token)
  } catch {
    tokenMasked = "••••"
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    accountType: row.accountType.toLowerCase(),
    instagramBusinessAccountId: row.instagramBusinessAccountId,
    facebookPageId: row.facebookPageId,
    facebookPageName: row.facebookPageName,
    isActive: row.isActive,
    connectedAt: row.connectedAt.toISOString(),
    tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    hasToken: Boolean(row.accessTokenCiphertext),
    tokenMasked,
    scopes: row.scopes,
    profilePictureUrl: profilePictureFromMetadata(row.connectionMetadata),
  }
}

export async function getDecryptedPageAccessToken(accountId: string): Promise<string> {
  const row = await prisma.instagramAccount.findUnique({ where: { id: accountId } })
  if (!row) {
    throw new Error("Instagram hesabı bulunamadı.")
  }
  return decryptSecret({
    ciphertext: row.accessTokenCiphertext,
    iv: row.accessTokenIv,
    authTag: row.accessTokenAuthTag,
  })
}

export async function getActiveInstagramAccountWithToken() {
  const row = await prisma.instagramAccount.findFirst({
    where: { isActive: true },
    orderBy: { connectedAt: "desc" },
  })
  if (!row) return null

  const accessToken = await getDecryptedPageAccessToken(row.id)
  return { account: row, accessToken }
}
