"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/AppContext";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SignInModal } from "@/components/auth/SignInModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  listingId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function FavoriteButton({ listingId, variant = "ghost", size = "sm" }: FavoriteButtonProps) {
  const { user, favorites, setFavorites } = useAppContext();
  const { toast } = useToast();
  const [showSignIn, setShowSignIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();
  
  // Check if this listing is in the favorites array from AppContext
  const isFavorited = favorites.includes(listingId);

  const handleFavoriteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!user) {
      setShowSignIn(true);
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorited) {
        // Remove from Supabase
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        
        // Update local state by removing this ID from favorites
        setFavorites(favorites.filter(id => id !== listingId));

        toast({
          title: "Removed from favorites",
          description: "The listing has been removed from your favorites",
        });
      } else {
        // Add to Supabase
        await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            listing_id: listingId,
          });
        
        // Update local state by adding this ID to favorites
        setFavorites([...favorites, listingId]);

        toast({
          title: "Added to favorites",
          description: "The listing has been added to your favorites",
          variant: "success",
        });
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast({
        title: "Error",
        description: "There was a problem updating your favorites. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size="favorite"
        onClick={(e) => {
          e.preventDefault();
          handleFavoriteClick(e);
        }}
        disabled={isLoading}
        className={cn(
          "hover:bg-transparent",
          isFavorited && "text-emerald-600 hover:text-emerald-700"
        )}
      >
        <Heart
          className={cn(
            isFavorited && "fill-emerald-600"
          )}
        />
      </Button>

      <SignInModal 
        isOpen={showSignIn} 
        onClose={() => setShowSignIn(false)}
      />
    </>
  );
} 