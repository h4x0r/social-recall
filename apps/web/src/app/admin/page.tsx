"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  RefreshCw,
  Building2,
  MapPin,
  User,
  GraduationCap,
  Briefcase,
  ChevronDown,
} from "lucide-react";

interface TimelineEntry {
  id: string;
  field: "name" | "headline" | "location" | "employers" | "education";
  oldValue: unknown;
  newValue: unknown;
  detectedAt: string;
  contactId: string;
  contactName: string;
  linkedinId: string;
}

interface Stats {
  contacts: number;
  history: number;
}

const FIELD_ICONS: Record<string, React.ReactNode> = {
  name: <User className="w-4 h-4" />,
  headline: <Briefcase className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  employers: <Building2 className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  headline: "Title",
  location: "Location",
  employers: "Company",
  education: "Education",
};

function formatValue(field: string, value: unknown): string {
  if (!value) return "(empty)";

  if (field === "employers" && Array.isArray(value)) {
    const emp = value[0];
    return emp?.company || "(unknown)";
  }

  if (field === "education" && Array.isArray(value)) {
    const edu = value[0];
    return edu?.school || "(unknown)";
  }

  if (typeof value === "string") {
    return value.length > 50 ? value.slice(0, 47) + "..." : value;
  }

  return JSON.stringify(value);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function groupByDate(entries: TimelineEntry[]): Map<string, TimelineEntry[]> {
  const groups = new Map<string, TimelineEntry[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const entry of entries) {
    const entryDate = new Date(entry.detectedAt).toDateString();
    let label: string;

    if (entryDate === today) {
      label = "Today";
    } else if (entryDate === yesterday) {
      label = "Yesterday";
    } else {
      label = new Date(entry.detectedAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(entry);
  }

  return groups;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldFilter, setFieldFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get token from Supabase session
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Not authenticated");
        return;
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
      };

      // Fetch timeline and stats in parallel
      const [timelineRes, statsRes] = await Promise.all([
        fetch(
          `/api/admin/timeline${fieldFilter ? `?field=${fieldFilter}` : ""}`,
          { headers }
        ),
        fetch("/api/admin/stats", { headers }),
      ]);

      if (!timelineRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [timelineData, statsData] = await Promise.all([
        timelineRes.json(),
        statsRes.json(),
      ]);

      setEntries(timelineData.entries || []);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [fieldFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedEntries = groupByDate(entries);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Change Timeline</h1>
          <p className="text-muted-foreground">
            Profile changes detected across all contacts
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="text-3xl font-bold">{stats.contacts}</div>
            <div className="text-sm text-muted-foreground">Contacts</div>
          </div>
          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="text-3xl font-bold">{stats.history}</div>
            <div className="text-sm text-muted-foreground">History Entries</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <div className="relative">
          <select
            value={fieldFilter || ""}
            onChange={(e) => setFieldFilter(e.target.value || null)}
            className="appearance-none bg-card border border-border rounded-md px-3 py-1.5 pr-8 text-sm"
          >
            <option value="">All changes</option>
            <option value="name">Name</option>
            <option value="headline">Title</option>
            <option value="location">Location</option>
            <option value="employers">Company</option>
            <option value="education">Education</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No changes detected yet
          </div>
        ) : (
          Array.from(groupedEntries.entries()).map(([date, dateEntries]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {date}
              </h2>
              <div className="space-y-2">
                {dateEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-muted rounded-md">
                        {FIELD_ICONS[entry.field]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{entry.contactName}</span>
                          <span className="text-muted-foreground">
                            changed {FIELD_LABELS[entry.field]}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground line-through">
                            {formatValue(entry.field, entry.oldValue)}
                          </span>
                          <span className="mx-2">→</span>
                          <span className="text-foreground">
                            {formatValue(entry.field, entry.newValue)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatRelativeTime(entry.detectedAt)}</span>
                          <a
                            href={`https://linkedin.com/in/${entry.linkedinId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            View Profile →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
