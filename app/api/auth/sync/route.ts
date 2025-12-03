import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const body = await request.json()
    const { access_token, refresh_token } = body
    
    if (!access_token) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing access_token'
      }, { status: 400 })
    }
    
    // Create response that will hold cookies
    let response = NextResponse.json({ success: true })
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // Set cookies in both cookieStore and response
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, {
                ...options,
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                path: '/',
              })
            })
          },
        },
      }
    )

    // Use setSession to properly set the session in cookies
    const { data: { session }, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    })
    
    if (error) {
      console.error('setSession error:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message
      }, { status: 400 })
    }
    
    if (session) {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Update response with user data and return it (cookies already set)
      const jsonData = { 
        success: true,
        user: user ? { id: user.id, email: user.email } : null,
        session: 'set'
      }
      
      // Create new response with same cookies
      const finalResponse = NextResponse.json(jsonData)
      
      // Copy all cookies from the supabase response
      response.cookies.getAll().forEach(cookie => {
        finalResponse.cookies.set(cookie.name, cookie.value, {
          sameSite: 'lax' as const,
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          path: '/',
        })
      })
      
      return finalResponse
    }

    return NextResponse.json({ 
      success: false,
      error: 'Failed to set session'
    }, { status: 400 })
  } catch (error) {
    console.error('Sync route error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Keep GET for backwards compatibility
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Just check existing session
    const { data: { user } } = await supabase.auth.getUser()
    
    return NextResponse.json({ 
      success: true,
      user: user ? { id: user.id, email: user.email } : null 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
