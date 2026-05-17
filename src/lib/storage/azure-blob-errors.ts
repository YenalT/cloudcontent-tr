import "server-only"

export const AZURE_BLOB_NOT_CONFIGURED_MESSAGE =
  "Azure Blob Storage must be configured before sending Instagram assets to Zapier."

export class AzureBlobStorageError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(
    message: string,
    options?: { code?: string; retryable?: boolean; cause?: unknown }
  ) {
    super(message, { cause: options?.cause })
    this.name = "AzureBlobStorageError"
    this.code = options?.code ?? "azure_blob_error"
    this.retryable = options?.retryable ?? false
  }
}

export function toAdminAzureBlobErrorMessage(error: unknown): string {
  if (error instanceof AzureBlobStorageError) return error.message
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("accountname")) {
      return "Geçersiz bağlantı dizesi: AccountName bulunamadı."
    }
    if (msg.includes("authentication") || msg.includes("403")) {
      return "Azure kimlik doğrulaması başarısız. Bağlantı dizesini kontrol edin."
    }
    if (msg.includes("container") && msg.includes("not found")) {
      return "Konteyner bulunamadı. «Konteyner oluştur» ile oluşturun."
    }
    return error.message
  }
  return "Azure Blob Storage işlemi başarısız."
}

export function maskConnectionString(connectionString: string): string {
  return connectionString
    .split(";")
    .map((part) => {
      const [key, ...rest] = part.split("=")
      if (!key || rest.length === 0) return part
      const lower = key.toLowerCase()
      if (lower === "accountkey" || lower === "sharedaccesssignature") {
        return `${key}=••••••••`
      }
      return part
    })
    .join(";")
}
