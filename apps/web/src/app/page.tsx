"use client";

import { Suspense, useState, useDeferredValue } from "react";
import { ContactList } from "@/components/contacts/contact-list";
import { OpportunityFeed } from "@/components/opportunities/opportunity-feed";
import { SearchBar } from "@/components/search/search-bar";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  // Use deferred value to avoid blocking input during search
  const deferredSearch = useDeferredValue(searchQuery);

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="mb-12 animate-fade-in-up">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl lg:text-6xl">
            Your Network,{" "}
            <span className="text-gradient italic">Remembered</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Your network is your edge. Query it like a database. Surface the
            right person for any need.
          </p>
        </section>

        {/* Search */}
        <section className="mb-10 animate-fade-in-up stagger-1">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </section>

        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contacts Column - Takes 2/3 */}
          <section className="lg:col-span-2 animate-fade-in-up stagger-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl">Recent Contacts</h2>
              <span className="font-data text-sm text-muted-foreground">
                2,847 total
              </span>
            </div>
            <Suspense fallback={<ContactListSkeleton />}>
              <ContactList search={deferredSearch || undefined} />
            </Suspense>
          </section>

          {/* Opportunities Column - Takes 1/3 */}
          <aside className="animate-fade-in-up stagger-3">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl">Opportunities</h2>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning text-xs font-bold text-warning-foreground">
                3
              </span>
            </div>
            <Suspense fallback={<OpportunitySkeleton />}>
              <OpportunityFeed />
            </Suspense>
          </aside>
        </div>
      </main>
      </div>
    </AuthGuard>
  );
}

function ContactListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OpportunitySkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="mb-2 h-4 w-1/4" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
