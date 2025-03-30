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

// Create a Supabase client for frontend use
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey
);

/**
 * Get full redirect URL for auth callbacks
 */
export const getRedirectURL = (path = 'auth/callback') => {
  const baseUrl = getURL();
  return `${baseUrl}${path.startsWith('/') ? path.slice(1) : path}`;
}; 