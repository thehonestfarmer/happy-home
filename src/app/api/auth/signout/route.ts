import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Sign out from the server side - this will also clear the cookies
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      console.error('Supabase signOut error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Set the response with empty cookies to clear them on the client side
    const response = NextResponse.json({ success: true });
    
    // Add Cache-Control header to prevent caching
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
    return response;
  } catch (error) {
    console.error('Server-side sign-out error:', error);
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
  }
} 