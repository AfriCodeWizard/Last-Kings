"use client"

import { useEffect } from "react"

export function IOSMetaTags() {
  useEffect(() => {
    // Add iOS-specific meta tags and links that iOS Safari requires
    const addMetaTag = (name: string, content: string) => {
      if (!document.querySelector(`meta[name="${name}"]`)) {
        const meta = document.createElement("meta")
        meta.name = name
        meta.content = content
        document.head.appendChild(meta)
      }
    }

    const addLinkTag = (rel: string, href: string, sizes?: string) => {
      const selector = sizes 
        ? `link[rel="${rel}"][sizes="${sizes}"]`
        : `link[rel="${rel}"]`
      
      if (!document.querySelector(selector)) {
        const link = document.createElement("link")
        link.rel = rel
        link.href = href
        if (sizes) link.setAttribute("sizes", sizes)
        document.head.appendChild(link)
      }
    }

    // iOS PWA meta tags
    addMetaTag("apple-mobile-web-app-capable", "yes")
    addMetaTag("apple-mobile-web-app-status-bar-style", "black-translucent")
    addMetaTag("apple-mobile-web-app-title", "Last Kings")
    addMetaTag("mobile-web-app-capable", "yes")
    addMetaTag("application-name", "Last Kings")
    addMetaTag("theme-color", "#D4AF37")

    // Apple touch icons - iOS requires these for "Add to Home Screen"
    // iOS specifically looks for 180x180 for modern iPhones, but will fall back to other sizes
    // Priority order: 180x180 (optimal) > 192x192 (fallback) > 512x512 (fallback)
    addLinkTag("apple-touch-icon", "/icon-180x180.png", "180x180")
    addLinkTag("apple-touch-icon", "/icon-192x192.png", "192x192")
    addLinkTag("apple-touch-icon", "/icon-512x512.png", "512x512")
    // Default fallback (iOS will use this if sizes aren't specified)
    addLinkTag("apple-touch-icon", "/icon-192x192.png")
  }, [])

  return null
}

