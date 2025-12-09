"use client"

import { supabase } from "./supabase/client"

/**
 * Syncs the session from localStorage to cookies so middleware can read it
 * This is done by calling an API route that uses SSR client to set cookies
 * This is critical for server-side auth checks to work properly
 */
export async function syncSessionToCookies(): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Error getting session:', sessionError)
      return false
    }
    
    if (!session) {
      // No session is fine - user might be logged out
      return false
    }

    // Get both tokens from the session
    const accessToken = session.access_token
    const refreshToken = session.refresh_token

    if (!accessToken) {
      console.error('No access token in session')
      return false
    }

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
        refresh_token: refreshToken || '',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Session sync HTTP error:', response.status, errorText)
      return false
    }

    const data = await response.json()
    
    if (!data.success) {
      console.error('Session sync failed:', data.error || data)
      return false
    }

    // Only log success in development to avoid console spam
    if (process.env.NODE_ENV === 'development') {
      console.log('Session synced to cookies successfully')
    }
    return true
  } catch (error) {
    console.error('Error syncing session to cookies:', error)
    return false
  }
}
