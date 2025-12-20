"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Mock data - will be replaced with real data from Supabase
const mockContacts = [
  {
    id: "1",
    name: "Sarah Chen",
    headline: "Partner @ Sequoia Capital",
    employers: [
      { company: "Sequoia Capital", logo: "" },
      { company: "Goldman Sachs", logo: "" },
    ],
    skills: ["Venture Capital", "Fintech", "B2B SaaS"],
    lastUpdated: "2 hours ago",
    isNew: true,
  },
  {
    id: "2",
    name: "Marcus Johnson",
    headline: "CTO @ Stealth Startup",
    employers: [{ company: "Stealth", logo: "" }, { company: "Meta", logo: "" }],
    skills: ["AI/ML", "Infrastructure", "Distributed Systems"],
    lastUpdated: "1 day ago",
    isNew: false,
  },
  {
    id: "3",
    name: "Elena Rodriguez",
    headline: "CISO @ Cloudflare",
    employers: [
      { company: "Cloudflare", logo: "" },
      { company: "Cisco", logo: "" },
    ],
    skills: ["Cloud Security", "Zero Trust", "Incident Response"],
    lastUpdated: "3 days ago",
    isNew: false,
  },
  {
    id: "4",
    name: "David Kim",
    headline: "Founder & CEO @ BuildFast",
    employers: [{ company: "BuildFast", logo: "" }],
    skills: ["Developer Tools", "Product", "Go-to-Market"],
    lastUpdated: "1 week ago",
    isNew: false,
  },
  {
    id: "5",
    name: "Amanda Okonkwo",
    headline: "VP Engineering @ Stripe",
    employers: [
      { company: "Stripe", logo: "" },
      { company: "Uber", logo: "" },
    ],
    skills: ["Payments", "Platform", "Engineering Leadership"],
    lastUpdated: "2 weeks ago",
    isNew: false,
  },
];

export function ContactList() {
  return (
    <div className="space-y-3">
      {mockContacts.map((contact, index) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          className={`stagger-${index + 1}`}
        />
      ))}
    </div>
  );
}

interface ContactCardProps {
  contact: (typeof mockContacts)[0];
  className?: string;
}

function ContactCard({ contact, className }: ContactCardProps) {
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`group relative flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all card-hover cursor-pointer animate-fade-in-up ${className}`}
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

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {contact.skills.slice(0, 3).map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="text-xs font-normal"
            >
              {skill}
            </Badge>
          ))}
          {contact.skills.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{contact.skills.length - 3}
            </Badge>
          )}
        </div>
      </div>

      {/* Employers */}
      <div className="hidden shrink-0 sm:flex items-center -space-x-2">
        {contact.employers.slice(0, 3).map((employer, i) => (
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
