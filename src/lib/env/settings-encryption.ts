import "server-only"

/** Exact env var name — must match `.env` and `prisma` does not use this key. */
export const SETTINGS_ENCRYPTION_KEY_ENV = "SETTINGS_ENCRYPTION_KEY" as const

const MIN_KEY_LENGTH = 16

export type SettingsEncryptionKeyStatus = {
  /** Safe to send to client — never includes the secret value. */
  configured: boolean
  /** Character length of the key (0 if missing). Never logs the key itself. */
  keyLength: number
  /** Human-readable status for admin UI and logs. */
  debugMessage: string
  /** Where Next.js should load the variable from. */
  sourceHint: string
}

/**
 * Read and validate SETTINGS_ENCRYPTION_KEY from process.env (server-only).
 * Next.js loads `.env` at the project root for `next dev` / `next build`.
 * Variables without NEXT_PUBLIC_ are never exposed to the browser bundle.
 */
export function getSettingsEncryptionKeyStatus(): SettingsEncryptionKeyStatus {
  const raw = process.env[SETTINGS_ENCRYPTION_KEY_ENV]
  const sourceHint =
    "Project root `.env` (or `.env.local`). Restart `npm run dev` after changes."

  if (raw === undefined || raw === "") {
    return {
      configured: false,
      keyLength: 0,
      debugMessage: `${SETTINGS_ENCRYPTION_KEY_ENV} is not set. Add it to ${sourceHint}`,
      sourceHint,
    }
  }

  const trimmed = raw.trim()

  if (trimmed.length < MIN_KEY_LENGTH) {
    return {
      configured: false,
      keyLength: trimmed.length,
      debugMessage: `${SETTINGS_ENCRYPTION_KEY_ENV} is too short (${trimmed.length} chars, need ≥${MIN_KEY_LENGTH}). Update .env and restart the dev server.`,
      sourceHint,
    }
  }

  return {
    configured: true,
    keyLength: trimmed.length,
    debugMessage: `${SETTINGS_ENCRYPTION_KEY_ENV} is loaded on the server (${trimmed.length} characters). API keys can be encrypted.`,
    sourceHint,
  }
}

/** Returns the trimmed key or throws — use only in server actions / RSC. */
export function requireSettingsEncryptionKey(): string {
  const status = getSettingsEncryptionKeyStatus()
  if (!status.configured) {
    throw new Error(status.debugMessage)
  }
  return process.env[SETTINGS_ENCRYPTION_KEY_ENV]!.trim()
}

export function isSettingsEncryptionConfigured(): boolean {
  return getSettingsEncryptionKeyStatus().configured
}
