"use client"

import { supabase } from "./supabase/client"

/**
 * Syncs the session from localStorage to cookies so middleware can read it
 * This is done by calling an API route that uses SSR client to set cookies
 */
export async function syncSessionToCookies(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.log('No session to sync')
      return false
    }

    // Get both tokens from the session
    const accessToken = session.access_token
    const refreshToken = session.refresh_token

    // Call an API route that will set cookies via SSR
    // Send both tokens so the API can properly set the session
    const response = await fetch('/api/auth/sync', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    })

    const data = await response.json()
    
    if (!response.ok || !data.success) {
      console.error('Session sync failed:', data)
      return false
    }

    console.log('Session synced to cookies successfully')
    return true
  } catch (error) {
    console.error('Error syncing session to cookies:', error)
    return false
  }
}
