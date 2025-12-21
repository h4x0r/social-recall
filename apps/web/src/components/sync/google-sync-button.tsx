"use client";

import { Button } from "@/components/ui/button";
import { useGoogleSync } from "@/hooks/use-google-sync";
import { Loader2 } from "lucide-react";

interface GoogleSyncButtonProps {
  compact?: boolean;
}

export function GoogleSyncButton({ compact = false }: GoogleSyncButtonProps) {
  const { isSyncing, lastSyncResult, error, sync } = useGoogleSync();

  const handleClick = () => {
    sync();
  };

  // Determine button text
  let buttonText = "Sync Google Contacts";
  if (isSyncing) {
    buttonText = "Syncing...";
  }

  // Determine status message
  let statusMessage: string | null = null;
  if (error) {
    statusMessage = error;
  } else if (lastSyncResult) {
    if (lastSyncResult.failed > 0) {
      statusMessage = `${lastSyncResult.synced} synced, ${lastSyncResult.failed} failed`;
    } else {
      statusMessage = `${lastSyncResult.synced} contacts synced`;
    }
  }

  if (compact) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handleClick}
        disabled={isSyncing}
        title="Sync Google Contacts"
      >
        {isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isSyncing}
        aria-label="Sync Google Contacts"
      >
        {isSyncing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        {buttonText}
      </Button>
      {statusMessage && (
        <span
          className={`text-xs ${
            error ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {statusMessage}
        </span>
      )}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
    >
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
  );
}
