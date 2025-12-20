"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Mail, ArrowRight } from "lucide-react";

export function LoginForm() {
  const { signInWithMagicLink, signInWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    const result = await signInWithMagicLink(email);
    if (result.success) {
      setMagicLinkSent(true);
    } else {
      setError(result.error || "Failed to send magic link");
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await signInWithGoogle({ includeContacts: true });
    if (!result.success) {
      setError(result.error || "Failed to sign in with Google");
    }
  };

  if (magicLinkSent) {
    return (
      <div className="text-center animate-fade-in-up">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-display text-2xl mb-2">Check your email</h2>
        <p className="text-muted-foreground mb-6">
          We sent a magic link to <span className="font-medium text-foreground">{email}</span>
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setMagicLinkSent(false);
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-in-up">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl tracking-tight mb-2">
          Welcome to <span className="text-gradient italic">Social Recall</span>
        </h1>
        <p className="text-muted-foreground">
          Your personal CRM for meaningful connections
        </p>
      </div>

      <div className="space-y-4">
        {/* Google Sign In */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 font-medium"
          onClick={handleGoogle}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or continue with email
            </span>
          </div>
        </div>

        {/* Magic Link Form */}
        <form onSubmit={handleMagicLink} className="space-y-3">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Send Magic Link
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-destructive text-center animate-fade-in-up">
            {error}
          </p>
        )}

        <p className="text-xs text-center text-muted-foreground pt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
