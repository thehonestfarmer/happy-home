# Authentication Guidelines

This document provides guidelines for implementing authentication in Happy Home Japan.

## OAuth Authentication Flow

We've standardized the OAuth authentication flow across the application to ensure consistent behavior and a smoother user experience on both desktop and mobile devices.

### Components

1. **GoogleSignInButton**: A reusable button component that consistently handles OAuth sign-in.
   - Located at: `src/components/auth/GoogleSignInButton.tsx`
   - Features:
     - Consistent OAuth flow with proper callback URL handling
     - Responsive design for both mobile and desktop
     - Loading states and error handling
     - Customizable appearance and behavior

2. **useOAuthListener**: A hook that listens for OAuth callback messages from popup windows.
   - Located at: `src/hooks/useOAuthListener.ts`
   - Features:
     - Handles communication between popup windows and the main application
     - Provides callbacks for success and error cases

3. **Auth Callback Route**: A route that handles the OAuth callback from the provider.
   - Located at: `src/app/auth/callback/route.ts`
   - Features:
     - Exchanges the OAuth code for a session
     - Handles redirects after authentication
     - Provides visual feedback during the process
     - Works properly in both popup and redirect flows

### Usage Guidelines

When implementing authentication in your feature, follow these guidelines:

#### 1. Use the Standardized Components

Always use the `GoogleSignInButton` component instead of creating custom OAuth implementations. This ensures consistent behavior and reduces the risk of errors.

```tsx
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

// Basic usage
<GoogleSignInButton />

// With customization
<GoogleSignInButton 
  variant="primary" 
  text="Continue with Google"
  fullWidth={true}
  className="my-custom-class"
  onSignInStart={() => setLoading(true)}
  onSignInError={(error) => handleError(error)}
/>

// For responsive UI
<GoogleSignInButton mode="desktop" />
<GoogleSignInButton mode="mobile" />
```

#### 2. Handle Auth State

When you need to handle authentication state, use the Supabase auth hooks:

```tsx
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Inside your component
const supabase = createClientComponentClient();
const [user, setUser] = useState(null);

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setUser(session?.user || null);
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, [supabase]);
```

#### 3. Listen for Auth Completion in Modals

When using OAuth in modals, use the `useOAuthListener` hook to detect when authentication is complete:

```tsx
import { useOAuthListener } from "@/hooks/useOAuthListener";

// Inside your modal component
useOAuthListener({
  onSuccess: () => {
    // Close modal or update UI
    closeModal();
  },
  onError: (error) => {
    // Handle error
    setError(error);
  },
});
```

### Troubleshooting

Common issues and their solutions:

1. **Callback URL Issues**: If the OAuth flow is failing with redirect errors, ensure that the allowed callback URLs are properly configured in the Google Cloud Console.

2. **Mobile Browser Compatibility**: The OAuth flow is designed to work on both desktop and mobile, but some mobile browsers may handle popups differently. Our implementation falls back to redirect flow when popups aren't supported.

3. **Session Issues**: If users are not staying logged in, check that the session cookies are being properly set and the Supabase client is initialized correctly.

## Security Considerations

1. Always use HTTPS for all authentication flows.
2. Never store sensitive auth tokens in localStorage.
3. Validate the origin of OAuth callback messages to prevent cross-site forgery.
4. Use the built-in Supabase session management rather than implementing custom solutions.

For questions or additional assistance, please contact the development team. 