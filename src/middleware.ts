import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Handle admin routes with basic auth
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !isValidAuth(authHeader)) {
      return new NextResponse(null, {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Access Required"',
        },
      })
    }
  }

  // Skip auth handling for sign-out API route to prevent circular dependencies
  if (req.nextUrl.pathname === '/api/auth/signout') {
    return NextResponse.next();
  }

  // Handle Supabase auth
  const res = NextResponse.next();
  
  // Create supabase client with correct cookie handling
  const supabase = createMiddlewareClient({ 
    req, 
    res,
  });
  
  // This refreshes the session if needed and sets the auth cookie
  await supabase.auth.getSession();
  
  return res;
}

function isValidAuth(authHeader: string): boolean {
  const base64Credentials = authHeader.split(' ')[1]
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
  const [username, password] = credentials.split(':')
  
  return username === process.env.ADMIN_USERNAME && 
         password === process.env.ADMIN_PASSWORD
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * But include:
     * - /admin routes (for basic auth)
     * - /auth/callback (for authentication)
     * - /api/auth/signout (for sign-out)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    '/admin/:path*',
    '/auth/callback(.*)',
    '/api/auth/signout'
  ]
} 