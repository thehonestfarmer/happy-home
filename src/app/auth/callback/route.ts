import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getURL } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Create the supabase client with await on cookies()
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Return HTML that properly handles redirects in different scenarios
  return new NextResponse(
    `
    <html>
      <head>
        <title>Authentication Complete</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
            color: #374151;
          }
          .container {
            text-align: center;
            max-width: 400px;
          }
          .spinner {
            border: 3px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top: 3px solid #3b82f6;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .message {
            margin-bottom: 20px;
          }
          .error {
            color: #ef4444;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <p class="message">Completing sign in...</p>
          <p id="errorMessage" class="error" style="display: none;"></p>
        </div>
        
        <script>
          // Log the current URL for debugging
          console.log('Callback URL:', window.location.href);
          
          // Helper function to get the correct base URL based on environment
          function getBaseURL() {
            const isDevelopment = window.location.hostname.includes('localhost');
            return isDevelopment
              ? window.location.origin
              : 'https://happyhomejapan.com';
          }
          
          // Function to handle redirect with proper error handling
          function handleRedirect() {
            try {
              // Check for stored redirect path
              const storedPath = localStorage.getItem('authRedirectPath');
              const redirectPath = storedPath || '/';
              
              // Clear the stored path
              localStorage.removeItem('authRedirectPath');
              
              // Get the appropriate base URL for this environment
              const baseUrl = getBaseURL();
              console.log('Base URL for redirect:', baseUrl);
              
              // If the stored path is a full URL, extract just the path
              let finalPath = redirectPath;
              if (redirectPath.includes('://')) {
                try {
                  const pathObj = new URL(redirectPath);
                  finalPath = pathObj.pathname + pathObj.search;
                } catch (e) {
                  console.warn('Could not parse stored redirect path:', e);
                }
              }
              
              // Ensure path starts with /
              if (!finalPath.startsWith('/')) {
                finalPath = '/' + finalPath;
              }
              
              // Construct the full redirect URL
              const redirectUrl = baseUrl + finalPath;
              console.log('Final redirect URL:', redirectUrl);
              
              // Redirect to the appropriate path
              window.location.href = redirectUrl;
            } catch (error) {
              // Show error message in case something goes wrong
              const errorMessage = document.getElementById('errorMessage');
              errorMessage.textContent = 'Error during redirect: ' + (error.message || 'Unknown error');
              errorMessage.style.display = 'block';
              console.error('Redirect error:', error);
              
              // Default redirect after delay in case of error
              setTimeout(() => {
                window.location.href = getBaseURL();
              }, 3000);
            }
          }
          
          // Check if this window was opened from another window
          if (window.opener && window.opener !== window) {
            try {
              // Communicate back to the opener and close this window
              window.opener.postMessage({ type: 'signInComplete', origin: window.location.origin }, '*');
              window.close();
              
              // In case the window doesn't close (some mobile browsers prevent this)
              setTimeout(() => {
                document.querySelector('.message').textContent = 'You can now close this window and return to the app.';
                document.querySelector('.spinner').style.display = 'none';
              }, 1000);
            } catch (error) {
              console.error('Opener communication error:', error);
              // Fallback to direct redirect if messaging fails
              handleRedirect();
            }
          } else {
            // Handle direct navigation case
            handleRedirect();
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