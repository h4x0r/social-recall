"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value?: string;
  onChange?: (query: string) => void;
  onHintClick?: (hint: string) => void;
}

export function SearchBar({ value, onChange, onHintClick }: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Use controlled or uncontrolled mode
  const query = value !== undefined ? value : localQuery;
  const setQuery = (newQuery: string) => {
    if (onChange) {
      onChange(newQuery);
    } else {
      setLocalQuery(newQuery);
    }
  };

  return (
    <div className="relative">
      <div
        className={`relative transition-all duration-300 ${
          isFocused ? "glow-amber" : ""
        }`}
      >
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name, company, skill, or note..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="h-14 rounded-xl border-border bg-card pl-12 pr-4 text-base placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search hints */}
      <div className="mt-3 flex flex-wrap gap-2">
        <SearchHint label="skill:React" onClick={() => {
          setQuery("skill:React");
          onHintClick?.("skill:React");
        }} />
        <SearchHint label="skill:Python" onClick={() => {
          setQuery("skill:Python");
          onHintClick?.("skill:Python");
        }} />
        <SearchHint label="note:follow up" onClick={() => {
          setQuery("note:follow up");
          onHintClick?.("note:follow up");
        }} />
        <SearchHint label="tag:VIP" onClick={() => {
          setQuery("tag:VIP");
          onHintClick?.("tag:VIP");
        }} />
      </div>
    </div>
  );
}

function SearchHint({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-all hover:border-primary hover:text-foreground"
    >
      {label}
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
