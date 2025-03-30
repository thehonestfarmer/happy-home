import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Helper function to get the appropriate site URL based on environment
 * This follows Supabase docs recommendation for handling redirects
 */
export const getURL = () => {
  // Check for explicit SITE_URL env var first
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL || // Set in production environment
    (process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : 'https://happyhomejapan.com');

  // Make sure to include `https://` when not localhost
  url = url.includes('localhost') ? url : url.startsWith('https') ? url : `https://${url}`;

  // Make sure to include trailing slash
  url = url.endsWith('/') ? url : `${url}/`;

  return url;
};

// Create a properly configured Supabase client for frontend use
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use implicit flow as it's more stable across browsers
      flowType: 'implicit',
      // Don't store in multiple storage locations to avoid conflicts
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') {
            return null;
          }
          return window.localStorage.getItem(key);
        },
        setItem: (key, value) => {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value);
          }
        },
        removeItem: (key) => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
          }
        }
      }
    },
    global: {
      headers: {
        'x-client-info': `happy-home/${process.env.npm_package_version || 'unknown'}`
      }
    }
  }
);

/**
 * Helper function to clear all Supabase auth data from storage
 * Use this for manual sign out when standard methods fail
 */
export const clearAuthData = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    // First call our server API to clear server-side session and HTTP-only cookies
    const response = await fetch('/api/auth/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies in the request
    });
    
    if (!response.ok) {
      console.error('Server-side sign out failed:', await response.text());
    }
  } catch (serverError) {
    console.error('Error calling server-side sign out:', serverError);
  }
  
  try {
    // Also clear localStorage for redundancy
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth.') || key.includes('token') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear from sessionStorage if it exists
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.includes('token') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    // Clear any cookies that might be accessible via JS
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing client-side auth data:', error);
    return false;
  }
};

/**
 * Get full redirect URL for auth callbacks
 */
export const getRedirectURL = (path = 'auth/callback') => {
  const baseUrl = getURL();
  return `${baseUrl}${path.startsWith('/') ? path.slice(1) : path}`;
}; 