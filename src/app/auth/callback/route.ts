import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Return HTML that closes the popup and redirects to the stored path
  return new NextResponse(
    `
    <html>
      <head>
        <title>Authentication Complete</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage('signInComplete', window.location.origin);
            window.close();
          } else {
            // Check for stored redirect path
            const storedPath = localStorage.getItem('authRedirectPath');
            if (storedPath) {
              localStorage.removeItem('authRedirectPath');
              window.location.href = storedPath;
            } else {
              window.location.href = '/';
            }
          }
        </script>
      </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
} 