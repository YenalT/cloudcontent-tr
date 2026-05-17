import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { brand } from "@/lib/brand"

import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: {
    default: `${brand.name} Admin`,
    template: `%s | ${brand.name}`,
  },
  description: brand.tagline,
  icons: { icon: "/icon.svg" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className={`${geistSans.className} min-h-screen`}>{children}</body>
    </html>
  )
}
