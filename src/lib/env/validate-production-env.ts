import { requireDatabaseUrlInProduction } from "@/lib/env/database-url"
import { isProductionDeployment, requireAzureStorageInProduction } from "@/lib/env/deployment"

/**
 * Validates required production environment variables at server startup.
 */
export function assertProductionEnvironment(): void {
  if (!isProductionDeployment()) return

  requireDatabaseUrlInProduction()
  requireAzureStorageInProduction()
}
