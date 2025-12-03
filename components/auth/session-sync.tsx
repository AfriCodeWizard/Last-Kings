"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { syncSessionToCookies } from "@/lib/auth-sync"

/**
 * Component that syncs session from localStorage to cookies on mount
 * This ensures middleware can read the session
 */
export function SessionSync() {
  useEffect(() => {
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await syncSessionToCookies()
      }
    }
    
    syncSession()
  }, [])

  return null
}
