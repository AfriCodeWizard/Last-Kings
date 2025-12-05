import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
})

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "Last Kings - Luxury Inventory & POS",
  description: "Premium inventory management and POS system for Last Kings liquor store",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Last Kings",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Last Kings POS",
    title: "Last Kings - Luxury Inventory & POS",
    description: "Premium inventory management and POS system",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "application-name": "Last Kings",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Last Kings",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#D4AF37",
    "msapplication-tap-highlight": "no",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#D4AF37",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body 
        className={`${inter.variable} ${playfair.variable} font-sans`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}

