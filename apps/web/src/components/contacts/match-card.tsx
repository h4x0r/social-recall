"use client";

import { Linkedin, Building2, Mail } from "lucide-react";
import type { MatchResult } from "@/lib/contact-matcher";

interface MatchCardProps {
  match: MatchResult;
  onSelect: (match: MatchResult) => void;
}

export function MatchCard({ match, onSelect }: MatchCardProps) {
  const { googleContact, score, confidence, signals } = match;

  const scoreColorClass =
    confidence === "high"
      ? "text-green-500 bg-green-500/10"
      : confidence === "medium"
        ? "text-yellow-500 bg-yellow-500/10"
        : "text-muted-foreground bg-muted";

  return (
    <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Score badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-sm font-medium px-2 py-0.5 rounded ${scoreColorClass}`}
            >
              {score}% match
            </span>
          </div>

          {/* Name */}
          <div className="font-medium truncate">{googleContact.name}</div>

          {/* Email */}
          {googleContact.email && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{googleContact.email}</span>
            </div>
          )}

          {/* Organization */}
          {googleContact.organization && (
            <div className="text-sm text-muted-foreground mt-1">
              {googleContact.organization}
            </div>
          )}

          {/* Match signals */}
          <div className="flex flex-wrap gap-2 mt-2">
            {signals.linkedinUrl && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                <Linkedin className="w-3 h-3" />
                LinkedIn Verified
              </span>
            )}
            {signals.employerMatch && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                <Building2 className="w-3 h-3" />
                Same Company
              </span>
            )}
          </div>
        </div>

        {/* Select button */}
        <button
          onClick={() => onSelect(match)}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shrink-0"
        >
          Select
        </button>
      </div>
    </div>
  );
}
