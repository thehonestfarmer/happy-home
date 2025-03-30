"use client";

import { useAppContext } from "@/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut, ChevronLeft } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { clearAuthData } from '@/lib/supabase/client';

interface NotificationSettings {
  marketing: boolean;
  newListings: boolean;
  priceDrops: boolean;
  savedSearches: boolean;
}

export default function AccountPage() {
  const { user, setUser } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationSettings>({
    marketing: false,
    newListings: false,
    priceDrops: false,
    savedSearches: false,
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Load notification settings from Supabase
    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setNotifications(data.notifications);
      }
    };

    if (user) {
      loadSettings();
    }
  }, [user, supabase]);

  const updateNotificationSetting = async (key: keyof NotificationSettings) => {
    const newSettings = {
      ...notifications,
      [key]: !notifications[key],
    };

    setNotifications(newSettings);

    // Update in Supabase
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user?.id,
        notifications: newSettings,
      });

    if (error) {
      console.error('Error updating settings:', error);
      // Revert the change if there was an error
      setNotifications(notifications);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // First, try the standard sign out
      const { error } = await supabase.auth.signOut({ 
        scope: 'local'
      });
      
      if (error) {
        console.log('Standard sign out failed, using fallback approach:', error.message);
        
        // Use our async helper function to clear auth data
        await clearAuthData();
      } else {
        console.log('Sign out successful via Supabase API');
        
        // Even if the Supabase API call succeeded, also call our server-side cleanup
        // This ensures all cookies are properly cleared
        await clearAuthData();
      }
      
      // Always update app context
      setUser(null);
      
      // Force a full page reload to clear any in-memory state
      console.log('Redirecting to home page...');
      window.location.href = '/';
    } catch (error) {
      console.error('Exception during sign out:', error);
      
      // Even if everything fails, try to clear state and redirect 
      setUser(null);
      try {
        await clearAuthData();
      } catch (clearError) {
        console.error('Failed to clear auth data:', clearError);
      }
      window.location.href = '/';
    }
  };

  const handleBackToListings = () => {
    router.push('/listings');
  };

  const handleGoogleLogin = async () => {
    try {
      // Store current URL to return to this page after auth
      localStorage.setItem('authRedirectPath', pathname);
      
      console.log('Signing in with Google');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging in with Google:', error);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Please sign in to view and manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <p className="mb-6 text-center text-muted-foreground">
              Sign in to access your profile information and notification preferences
            </p>
            <GoogleSignInButton
              variant="primary"
              className="bg-black text-primary border-black hover:bg-primary hover:text-black transition-colors w-full sm:w-auto"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 max-w-2xl lg:max-w-4xl pt-0 pb-4 sm:py-8">
      {/* Standardized header section with Back button */}
      <div className="mb-8 -mt-4 sm:mt-0">
        <div className="bg-primary text-primary-foreground -mx-4 sm:mx-0 sm:rounded-lg px-4 sm:px-6 pt-6 pb-5 mb-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Account Settings</h1>
              <p className="mt-2.5 text-sm opacity-90">Manage your profile and preferences</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden lg:flex text-primary-foreground hover:bg-primary-foreground/10 -mt-1"
              onClick={handleBackToListings}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Listings
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop layout with improved flow */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Left column - Profile Information */}
        <div className="lg:col-span-1">
          <Card className="mb-8 lg:mb-0 sticky top-4">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your basic account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center">
                {user.user_metadata?.avatar_url ? (
                  <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden">
                    <Image 
                      src={user.user_metadata.avatar_url} 
                      alt="Profile" 
                      width={96}
                      height={96}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 mb-4 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-3xl">{user.email?.[0].toUpperCase()}</span>
                  </div>
                )}
                <div className="w-full">
                  <div className="font-medium text-lg">{user.user_metadata?.full_name}</div>
                  <div className="text-sm text-muted-foreground mb-4">{user.email}</div>
                  <div className="flex flex-col gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {}}
                    >
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-red-600 hover:bg-red-50 hover:text-red-600"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Notification Settings */}
        <div className="lg:col-span-2">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Manage your email preferences</CardDescription>
            </CardHeader>
            <CardContent className="relative flex flex-col gap-6">
              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-b-lg">
                <div className="bg-muted/90 px-4 py-2 rounded-md shadow-sm">
                  <span className="text-sm font-medium">Coming Soon</span>
                </div>
                <p className="text-muted-foreground text-sm mt-2 text-center max-w-xs">
                  Email notification settings will be available in a future update
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground">Marketing Updates</Label>
                  <div className="text-sm text-muted-foreground/70">
                    Receive emails about new features and updates
                  </div>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={() => {}}
                  disabled={true}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground">New Listings</Label>
                  <div className="text-sm text-muted-foreground/70">
                    Get notified when new properties match your search criteria
                  </div>
                </div>
                <Switch
                  checked={notifications.newListings}
                  onCheckedChange={() => {}}
                  disabled={true}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground">Price Drops</Label>
                  <div className="text-sm text-muted-foreground/70">
                    Receive alerts when saved properties drop in price
                  </div>
                </div>
                <Switch
                  checked={notifications.priceDrops}
                  onCheckedChange={() => {}}
                  disabled={true}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground">Saved Searches</Label>
                  <div className="text-sm text-muted-foreground/70">
                    Get updates about your saved property searches
                  </div>
                </div>
                <Switch
                  checked={notifications.savedSearches}
                  onCheckedChange={() => {}}
                  disabled={true}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Additional settings section for desktop */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Manage your privacy preferences</CardDescription>
            </CardHeader>
            <CardContent className="relative flex flex-col gap-6">
              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-b-lg">
                <div className="bg-muted/90 px-4 py-2 rounded-md shadow-sm">
                  <span className="text-sm font-medium">Coming Soon</span>
                </div>
                <p className="text-muted-foreground text-sm mt-2 text-center max-w-xs">
                  Privacy settings will be available in a future update
                </p>
              </div>
              
              <div className="h-32">
                {/* Placeholder content */}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 