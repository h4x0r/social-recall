"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { Download, Loader2, User } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "U";

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Export contacts data as JSON
      const response = await fetch("/api/export");
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `social-recall-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Header />

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <section className="mb-8 animate-fade-in-up">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
              Settings
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your account and preferences.
            </p>
          </section>

          {/* Profile Section */}
          <section className="mb-6 animate-fade-in-up stagger-1">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-lg mb-4">Profile</h2>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border">
                  <AvatarFallback className="bg-secondary font-display text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.name || "User"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Management Section */}
          <section className="mb-6 animate-fade-in-up stagger-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-display text-lg mb-4">Data Management</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Export Your Data</p>
                    <p className="text-sm text-muted-foreground">
                      Download all your contacts and data as JSON
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
