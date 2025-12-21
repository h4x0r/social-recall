"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useContacts } from "@/hooks/use-contacts";
import { Loader2, Sparkles } from "lucide-react";
import type { ContactWithEmployersAndSkills } from "@/lib/contact-repository";

interface SkillAggregate {
  name: string;
  count: number;
}

export default function SkillsPage() {
  const router = useRouter();
  const { contacts, isLoading } = useContacts({ withRelations: true });

  // Aggregate skills across all contacts
  const skillAggregates = useMemo(() => {
    const skillMap = new Map<string, number>();

    (contacts as ContactWithEmployersAndSkills[]).forEach((contact) => {
      (contact.skills || []).forEach((skill) => {
        const current = skillMap.get(skill.name) || 0;
        skillMap.set(skill.name, current + 1);
      });
    });

    const aggregates: SkillAggregate[] = Array.from(skillMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return aggregates;
  }, [contacts]);

  const handleSkillClick = (skillName: string) => {
    router.push(`/?search=${encodeURIComponent(`skill:${skillName}`)}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Header />

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <section className="mb-8 animate-fade-in-up">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
              Skills Explorer
            </h1>
            <p className="mt-2 text-muted-foreground">
              Discover skills across your network. Click any skill to find contacts.
            </p>
          </section>

          {/* Skills Grid */}
          <section className="animate-fade-in-up stagger-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading skills...</span>
              </div>
            ) : skillAggregates.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-display text-lg mb-2">No skills yet</h3>
                <p className="text-muted-foreground text-sm">
                  Skills are inferred from your contacts&apos; profiles.
                  <br />
                  Add contacts and infer their skills to see them here.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap gap-3">
                  {skillAggregates.map((skill) => (
                    <button
                      key={skill.name}
                      onClick={() => handleSkillClick(skill.name)}
                      className="group flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 transition-all hover:border-primary hover:bg-primary/10"
                    >
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {skill.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {skill.count} {skill.count === 1 ? "contact" : "contacts"}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
