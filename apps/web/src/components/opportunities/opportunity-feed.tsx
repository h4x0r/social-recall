"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mock data - will be replaced with real data from Supabase
const mockOpportunities = [
  {
    id: "1",
    type: "new_company" as const,
    contactName: "Sarah Chen",
    description: "Left Sequoia to start a new fintech company",
    detectedAt: "2 hours ago",
    relevance: "You invested in her last company",
  },
  {
    id: "2",
    type: "role_change" as const,
    contactName: "Marcus Johnson",
    description: "Now CTO at stealth AI startup",
    detectedAt: "1 day ago",
    relevance: "Former Meta colleague, AI/ML expert",
  },
  {
    id: "3",
    type: "left_job" as const,
    contactName: "Elena Rodriguez",
    description: "Departing Cloudflare after 4 years",
    detectedAt: "3 days ago",
    relevance: "Top security talent, could advise portfolio",
  },
];

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
  return (
    <div className="space-y-4">
      {mockOpportunities.map((opportunity, index) => (
        <OpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          className={`stagger-${index + 1}`}
        />
      ))}
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: (typeof mockOpportunities)[0];
  className?: string;
}

function OpportunityCard({ opportunity, className }: OpportunityCardProps) {
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
      <p className="text-sm text-muted-foreground mb-3">
        {opportunity.description}
      </p>

      {/* AI Relevance hint */}
      <div className="mb-4 rounded-md bg-secondary/50 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          <SparklesIcon className="mr-1 inline h-3 w-3 text-primary" />
          {opportunity.relevance}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs">
          View Profile
        </Button>
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">
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
