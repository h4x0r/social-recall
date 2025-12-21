"use client";

import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";
import { GoogleSyncButton } from "@/components/sync/google-sync-button";
import { useContacts } from "@/hooks/use-contacts";
import { Users, UserPlus, RefreshCw, Chrome } from "lucide-react";

export default function SyncPage() {
  const { totalCount, newCount } = useContacts();

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Header />

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <section className="mb-8 animate-fade-in-up">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
              Sync Status
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your contact sources and sync settings.
            </p>
          </section>

          {/* Statistics */}
          <section className="mb-6 animate-fade-in-up stagger-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-display text-3xl">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-6 text-center">
                <UserPlus className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="font-display text-3xl">{newCount}</p>
                <p className="text-sm text-muted-foreground">New Contacts</p>
              </div>
            </div>
          </section>

          {/* Connected Sources */}
          <section className="mb-6 animate-fade-in-up stagger-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-lg mb-4">Connected Sources</h2>
              <div className="space-y-4">
                {/* Google Contacts */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                      <svg viewBox="0 0 24 24" className="h-6 w-6">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Google Contacts</p>
                      <p className="text-sm text-muted-foreground">
                        Import contacts from your Google account
                      </p>
                    </div>
                  </div>
                  <GoogleSyncButton />
                </div>

                {/* Chrome Extension */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                      <Chrome className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Chrome Extension</p>
                      <p className="text-sm text-muted-foreground">
                        Save LinkedIn profiles while browsing
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
