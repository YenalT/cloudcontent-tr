import {
  LayoutDashboard,
  Link2,
  Upload,
  FileText,
  PlusCircle,
  Instagram,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const mainNavigation: NavGroup[] = [
  {
    label: "Genel",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Kaynaklar", href: "/sources", icon: Link2 },
      { title: "Yüklemeler", href: "/uploads", icon: Upload },
    ],
  },
  {
    label: "İçerik",
    items: [
      { title: "Makaleler", href: "/articles", icon: FileText },
      { title: "Yeni Makale", href: "/articles/new", icon: PlusCircle },
      { title: "Instagram", href: "/instagram", icon: Instagram },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "İş Günlükleri", href: "/logs", icon: ScrollText },
      { title: "Ayarlar", href: "/settings", icon: Settings },
    ],
  },
]

export function isActivePath(pathname: string, href: string) {
  if (href === "/articles") {
    return pathname === "/articles"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
