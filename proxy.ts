import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // If env vars are missing, only protect routes but don't use Supabase
    const protectedPaths = ['/dashboard', '/products', '/purchase-orders', '/receiving', '/inventory', '/pos', '/open-tab', '/reports', '/settings']
    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
    
    if (isProtected) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
    
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // COMPLETELY SKIP auth pages - let client handle everything
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return response
  }

  // Skip API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return response
  }

  // Only protect actual protected routes
  const protectedPaths = ['/dashboard', '/products', '/purchase-orders', '/receiving', '/inventory', '/pos', '/customers', '/reports', '/settings']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (!isProtected) {
    return response
  }

  // Get user from cookies
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  // Only redirect if we're on a protected route and no user
  if (!user || authError) {
    console.log('Proxy: No user found, redirecting to login')
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

