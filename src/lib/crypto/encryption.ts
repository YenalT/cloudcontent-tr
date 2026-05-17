import "server-only"

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

import { requireSettingsEncryptionKey } from "@/lib/env/settings-encryption"

const ALGORITHM = "aes-256-gcm"
const KEY_LENGTH = 32

export type EncryptedPayload = {
  ciphertext: string
  iv: string
  authTag: string
}

function deriveKey(): Buffer {
  const secret = requireSettingsEncryptionKey()
  return scryptSync(secret, "cloudcontent-tr-v1", KEY_LENGTH)
}

export function encryptSecret(plaintext: string): EncryptedPayload {
  const iv = randomBytes(12)
  const key = deriveKey()
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  }
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = deriveKey()
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64")
  )
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

export function maskApiKey(key: string) {
  if (key.length <= 4) return "••••"
  return `••••${key.slice(-4)}`
}
