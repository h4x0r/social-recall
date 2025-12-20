"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpportunities } from "@/hooks/use-opportunities";
import { RefreshCw, Zap } from "lucide-react";
import type { Opportunity } from "@/lib/opportunity-repository";
import type { OpportunityType } from "@/lib/opportunities";

// Display opportunity with contact info and relative time
interface DisplayOpportunity {
  id: string;
  type: OpportunityType;
  contactName: string;
  description: string;
  detectedAt: string;
}

// Format relative time from ISO date string
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Transform API opportunity to display format
function toDisplayOpportunity(opp: Opportunity): DisplayOpportunity {
  return {
    id: opp.id,
    type: opp.type,
    contactName: opp.contact.name,
    description: opp.description,
    detectedAt: formatRelativeTime(opp.detectedAt),
  };
}

const opportunityTypeConfig = {
  new_company: {
    label: "New Company",
    icon: RocketIcon,
    color: "bg-success/10 text-success border-success/20",
  },
  role_change: {
    label: "Role Change",
    icon: ArrowRightIcon,
    color: "bg-primary/10 text-primary border-primary/20",
  },
  left_job: {
    label: "Departure",
    icon: DoorIcon,
    color: "bg-warning/10 text-warning border-warning/20",
  },
};

export function OpportunityFeed() {
  const { opportunities, isLoading, error, refresh, dismiss } = useOpportunities();

  // Transform to display format
  const displayOpportunities = opportunities.map(toDisplayOpportunity);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-5 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3 mb-3" />
            <Skeleton className="h-8 w-full" />
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
  if (displayOpportunities.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-display text-lg mb-2">No opportunities yet</h3>
        <p className="text-muted-foreground text-sm">
          We&apos;ll surface opportunities as your contacts make career moves.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayOpportunities.map((opportunity, index) => (
        <OpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          className={`stagger-${index + 1}`}
          onDismiss={() => dismiss(opportunity.id)}
        />
      ))}
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: DisplayOpportunity;
  className?: string;
  onDismiss?: () => void;
}

function OpportunityCard({ opportunity, className, onDismiss }: OpportunityCardProps) {
  const config = opportunityTypeConfig[opportunity.type];
  const Icon = config.icon;

  return (
    <div
      className={`group rounded-lg border border-border bg-card p-4 transition-all card-hover animate-fade-in-up ${className}`}
    >
      {/* Type badge */}
      <div className="mb-3 flex items-center justify-between">
        <Badge
          variant="outline"
          className={`gap-1.5 ${config.color}`}
        >
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        <span className="font-data text-xs text-muted-foreground">
          {opportunity.detectedAt}
        </span>
      </div>

      {/* Contact name */}
      <h4 className="font-display text-base mb-1 group-hover:text-primary transition-colors cursor-pointer">
        {opportunity.contactName}
      </h4>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">
        {opportunity.description}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs">
          View Profile
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function DoorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <path d="M2 20h20" />
      <path d="M14 12v.01" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
