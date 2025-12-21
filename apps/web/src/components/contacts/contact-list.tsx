"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkillInference } from "@/hooks/use-skill-inference";
import { useContacts } from "@/hooks/use-contacts";
import { ContactDetail } from "./contact-detail";
import { Sparkles, Loader2, RefreshCw, Users } from "lucide-react";
import type { ContactWithEmployersAndSkills } from "@/lib/contact-repository";

// Contact type for display (combines DB data with computed fields)
interface DisplayContact {
  id: string;
  name: string;
  headline: string | null;
  employers: { company: string; logo: string }[];
  skills: string[];
  tags: { id: string; name: string; color: string }[];
  lastUpdated: string;
  isNew: boolean;
}

// Format relative time from date string
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

interface ContactListProps {
  search?: string;
  skill?: string;
  note?: string;
  tag?: string;
  showHeader?: boolean;
}

export function ContactList({ search, skill, note, tag, showHeader = false }: ContactListProps = {}) {
  // Use withRelations to get employers and skills in a single query
  const { contacts, isLoading, error, totalCount, newCount, refresh } = useContacts({
    search,
    skill,
    note,
    tag,
    withRelations: true
  });
  const [selectedContact, setSelectedContact] = useState<DisplayContact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Transform DB contacts to display format
  const displayContacts: DisplayContact[] = (contacts as ContactWithEmployersAndSkills[]).map((c) => ({
    id: c.id,
    name: c.name,
    headline: c.headline,
    employers: (c.employers || []).map((e) => ({
      company: e.company,
      logo: e.logoUrl || '',
    })),
    skills: (c.skills || []).map((s) => s.name),
    tags: c.tags || [],
    lastUpdated: formatRelativeTime(c.updatedAt),
    isNew: c.isNew,
  }));

  const handleContactClick = (contact: DisplayContact) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
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

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (displayContacts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-display text-lg mb-2">No contacts yet</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Use the Chrome extension to save LinkedIn profiles, or sync your Google Contacts.
        </p>
      </div>
    );
  }

  return (
    <>
      {showHeader && (
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl">Recent Contacts</h2>
          <span className="font-data text-sm text-muted-foreground">
            {totalCount.toLocaleString()} total
            {newCount > 0 && (
              <span className="ml-2 text-primary">({newCount} new)</span>
            )}
          </span>
        </div>
      )}
      <div className="space-y-3">
        {displayContacts.map((contact, index) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            className={`stagger-${Math.min(index + 1, 6)}`}
            onClick={() => handleContactClick(contact)}
          />
        ))}
      </div>

      <ContactDetail
        contact={selectedContact}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

interface ContactCardProps {
  contact: DisplayContact;
  className?: string;
  onClick?: () => void;
}

function ContactCard({ contact, className, onClick }: ContactCardProps) {
  const [displaySkills, setDisplaySkills] = useState<string[]>(contact.skills);
  const { inferSkills, isLoading, error } = useSkillInference();

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleInferSkills = async () => {
    await inferSkills({
      id: contact.id,
      name: contact.name,
      headline: contact.headline,
      employers: contact.employers,
    });

    // Get from cache after inference
    const cached = localStorage.getItem(`skills:${contact.id}`);
    if (cached) {
      const data = JSON.parse(cached);
      setDisplaySkills(data.skills.map((s: { name: string }) => s.name));
    }
  };

  const hasNoSkills = displaySkills.length === 0;

  return (
    <div
      className={`group relative flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all card-hover cursor-pointer animate-fade-in-up ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* New indicator */}
      {contact.isNew && (
        <div className="absolute -left-px top-4 h-8 w-1 rounded-r-full bg-primary" />
      )}

      {/* Avatar */}
      <Avatar className="h-12 w-12 shrink-0 border border-border">
        <AvatarFallback className="bg-secondary font-display text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Name & headline */}
        <div className="mb-2">
          <h3 className="font-display text-lg leading-tight group-hover:text-primary transition-colors">
            {contact.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {contact.headline}
          </p>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {contact.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs font-normal"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
            {contact.tags.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{contact.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {displaySkills.slice(0, 3).map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="text-xs font-normal"
            >
              {skill}
            </Badge>
          ))}
          {displaySkills.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{displaySkills.length - 3}
            </Badge>
          )}
          {hasNoSkills && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                handleInferSkills();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Inferring...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Infer Skills
                </>
              )}
            </Button>
          )}
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
        </div>
      </div>

      {/* Employers */}
      <div className="hidden shrink-0 sm:flex items-center -space-x-2">
        {contact.employers.slice(0, 3).map((employer) => (
          <div
            key={employer.company}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-bold"
            title={employer.company}
          >
            {employer.company[0]}
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="absolute right-4 top-4 font-data text-xs text-muted-foreground">
        {contact.lastUpdated}
      </div>
    </div>
  );
}
