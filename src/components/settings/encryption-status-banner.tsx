import type { SettingsEncryptionKeyStatus } from "@/lib/env/settings-encryption"

type EncryptionStatusBannerProps = {
  status: SettingsEncryptionKeyStatus
}

/**
 * Server component — renders env diagnostics without exposing the secret value.
 */
export function EncryptionStatusBanner({ status }: EncryptionStatusBannerProps) {
  return (
    <div
      className={
        status.configured
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          : "rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      }
      role="status"
    >
      <p className="font-medium">Şifreleme anahtarı (sunucu)</p>
      <p className="mt-1">{status.debugMessage}</p>
      <p className="mt-2 text-xs opacity-80">
        Kaynak: {status.sourceHint} · Uzunluk: {status.keyLength} karakter · Değer istemciye
        gönderilmez.
      </p>
    </div>
  )
}
