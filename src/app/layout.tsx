import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "טעימות יין | יקב מוניץ",
  description: "אפליקציית טעימות יין - יקב מוניץ",
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
