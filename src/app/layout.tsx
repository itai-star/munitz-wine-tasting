import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "טעימות יין | יקב מוניץ",
  description: "אפליקציית טעימות יין - יקב מוניץ",
  appleWebApp: {
    capable: true,
    title: "ניהול יקב מוניץ",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#722F37",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        {children}
      </body>
    </html>
  )
}
