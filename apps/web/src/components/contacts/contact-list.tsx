"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSkillInference } from "@/hooks/use-skill-inference";
import { ContactDetail } from "./contact-detail";
import { Sparkles, Loader2 } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  headline: string;
  employers: { company: string; logo: string }[];
  skills: string[];
  lastUpdated: string;
  isNew: boolean;
};

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
  {
    id: "6",
    name: "James Wright",
    headline: "Founder & CEO @ SecureStack",
    employers: [
      { company: "SecureStack", logo: "" },
      { company: "Palo Alto Networks", logo: "" },
    ],
    skills: [],
    lastUpdated: "3 weeks ago",
    isNew: false,
  },
];

export function ContactList() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        {mockContacts.map((contact, index) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            className={`stagger-${index + 1}`}
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
  contact: (typeof mockContacts)[0];
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
