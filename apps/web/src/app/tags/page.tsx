"use client";

import { TagManager } from "@/components/tags/tag-manager";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function TagsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Header />

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <section className="mb-8 animate-fade-in-up">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
              Manage Tags
            </h1>
            <p className="mt-2 text-muted-foreground">
              Create and organize tags to categorize your contacts.
            </p>
          </section>

          {/* Tag Manager */}
          <section className="animate-fade-in-up stagger-1">
            <TagManager />
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
