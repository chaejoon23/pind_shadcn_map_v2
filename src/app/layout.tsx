import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { GoogleAuthProvider } from "@/components/google-auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pind - Discover Places from YouTube Videos",
  description: "Visualize locations mentioned in YouTube videos on an interactive map",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleAuthProvider>{children}</GoogleAuthProvider>
      </body>
    </html>
  )
}
