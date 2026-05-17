import { PlatformShell } from "@/components/layout/platform-shell"

/** Platform routes use Prisma or runtime data — never statically prerender at build. */
export const dynamic = "force-dynamic"

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>
}
