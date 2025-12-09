"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { syncSessionToCookies } from "@/lib/auth-sync"

/**
 * Component that syncs session from localStorage to cookies
 * This ensures middleware can read the session
 * Listens for auth state changes to sync on token refresh
 */
export function SessionSync() {
  useEffect(() => {
    // Initial sync on mount
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await syncSessionToCookies()
      }
    }
    
    syncSession()

    // Listen for auth state changes (including token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state changed:', event, session ? 'session exists' : 'no session')
      }
      
      // Sync session to cookies whenever auth state changes
      // This handles: SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT, etc.
      if (session) {
        await syncSessionToCookies()
      }
    })

    // Periodic sync as a fallback (every 5 minutes)
    // This ensures cookies stay in sync even if events are missed
    const intervalId = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await syncSessionToCookies()
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Cleanup
    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
    }
  }, [])

  return null
}
