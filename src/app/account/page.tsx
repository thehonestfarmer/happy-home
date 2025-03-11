"use client";

import { useAppContext } from "@/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";

interface NotificationSettings {
  marketing: boolean;
  newListings: boolean;
  priceDrops: boolean;
  savedSearches: boolean;
}

export default function AccountPage() {
  const { user } = useAppContext();
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

  if (!user) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Not Signed In</CardTitle>
            <CardDescription>Please sign in to view your account settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      {/* Profile Information */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your basic account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {user.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <span className="text-2xl">{user.email?.[0].toUpperCase()}</span>
              </div>
            )}
            <div>
              <div className="font-medium">{user.user_metadata?.full_name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Manage your email preferences</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Marketing Updates</Label>
              <div className="text-sm text-muted-foreground">
                Receive emails about new features and updates
              </div>
            </div>
            <Switch
              checked={notifications.marketing}
              onCheckedChange={() => updateNotificationSetting('marketing')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Listings</Label>
              <div className="text-sm text-muted-foreground">
                Get notified when new properties match your search criteria
              </div>
            </div>
            <Switch
              checked={notifications.newListings}
              onCheckedChange={() => updateNotificationSetting('newListings')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Price Drops</Label>
              <div className="text-sm text-muted-foreground">
                Receive alerts when saved properties drop in price
              </div>
            </div>
            <Switch
              checked={notifications.priceDrops}
              onCheckedChange={() => updateNotificationSetting('priceDrops')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Saved Searches</Label>
              <div className="text-sm text-muted-foreground">
                Get updates about your saved property searches
              </div>
            </div>
            <Switch
              checked={notifications.savedSearches}
              onCheckedChange={() => updateNotificationSetting('savedSearches')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 