"use client";

import { OpportunityFeed } from "@/components/opportunities/opportunity-feed";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function OpportunitiesPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Header />

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <section className="mb-8 animate-fade-in-up">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
              Opportunities
            </h1>
            <p className="mt-2 text-muted-foreground">
              Career moves and opportunities in your network.
            </p>
          </section>

          {/* Opportunity Feed */}
          <section className="animate-fade-in-up stagger-1">
            <OpportunityFeed />
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
