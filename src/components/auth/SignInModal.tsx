"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Image from "next/image";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [email, setEmail] = useState("");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Join or sign in</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Continue with email
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button variant="outline" className="w-full hover:bg-accent hover:text-accent-foreground" onClick={() => {}}>
              <Image src="/google.svg" alt="Google" width={20} height={20} className="mr-2" />
              Continue with Google
            </Button>
            
            <Button variant="outline" className="w-full hover:bg-accent hover:text-accent-foreground" onClick={() => {}}>
              <Image src="/facebook.svg" alt="Facebook" width={20} height={20} className="mr-2" />
              Continue with Facebook
            </Button>
            
            <Button variant="outline" className="w-full hover:bg-accent hover:text-accent-foreground" onClick={() => {}}>
              <Image src="/apple.svg" alt="Apple" width={20} height={20} className="mr-2" />
              Continue with Apple
            </Button>

            <Button variant="outline" className="w-full hover:bg-accent hover:text-accent-foreground" onClick={() => {}}>
              <Image src="/coinbase.svg" alt="Coinbase" width={20} height={20} className="mr-2" />
              Continue with Coinbase
            </Button>

            <Button variant="outline" className="w-full hover:bg-accent hover:text-accent-foreground" onClick={() => {}}>
              <Image src="/ethereum.svg" alt="Ethereum" width={20} height={20} className="mr-2" />
              Continue with ETH
            </Button>
          </div>
        </div>

        <div className="text-xs text-center text-muted-foreground">
          By signing in you agree to our{" "}
          <a href="#" className="underline hover:text-primary">Terms of Use</a> and{" "}
          <a href="#" className="underline hover:text-primary">Privacy Policy</a>
        </div>
      </DialogContent>
    </Dialog>
  );
} 