"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Building2,
  User,
  Briefcase,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  linkedinId: string;
  name: string;
  headline: string | null;
  location: string | null;
  avatarPath: string | null;
  about: string | null;
  updateCount: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
  createdAt: string;
}

interface Employer {
  id: string;
  company: string;
  title: string | null;
  logoUrl: string | null;
  isCurrent: boolean;
}

interface Contribution {
  id: string;
  field: string;
  value: unknown;
  status: "pending" | "accepted" | "rejected";
  contributedBy: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  headline: "Headline",
  location: "Location",
  about: "About",
  avatar: "Photo",
  employers: "Experience",
  education: "Education",
  certifications: "Certifications",
  skills: "Skills",
  languages: "Languages",
  projects: "Projects",
  publications: "Publications",
  services: "Services",
  websites: "Websites",
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-600" },
  accepted: { bg: "bg-green-500/10", text: "text-green-600" },
  rejected: { bg: "bg-red-500/10", text: "text-red-600" },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(empty)";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") return parsed;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
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

export default function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedContributions, setExpandedContributions] = useState<Set<string>>(
    new Set()
  );
  const [isResolving, setIsResolving] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/profiles/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data.profile);
      setEmployers(data.employers || []);
      setContributions(data.contributions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleResolve = async (contributionId: string, action: "accept" | "reject") => {
    setIsResolving(contributionId);

    try {
      const response = await fetch(`/api/admin/profiles/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contributionId, action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to resolve contribution");
      }

      // Refresh data
      await fetchProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resolve");
    } finally {
      setIsResolving(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedContributions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (!publicUrl) return null;
    return `${publicUrl}/${path}`;
  };

  const pendingCount = contributions.filter((c) => c.status === "pending").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="flex gap-6">
            <div className="w-24 h-24 bg-muted rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/profiles"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profiles
        </Link>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/admin/profiles"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profiles
      </Link>

      {/* Profile Header - LinkedIn Style */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5" />

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <Avatar className="w-24 h-24 border-4 border-card">
              <AvatarImage src={getAvatarUrl(profile.avatarPath) || undefined} />
              <AvatarFallback className="text-2xl">
                <User className="w-12 h-12" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 pt-4 sm:pt-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  {profile.headline && (
                    <p className="text-muted-foreground">{profile.headline}</p>
                  )}
                  {profile.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {profile.location}
                    </p>
                  )}
                </div>
                <a
                  href={`https://linkedin.com/in/${profile.linkedinId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View on LinkedIn
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
            <span>First seen: {new Date(profile.firstSeenAt).toLocaleDateString()}</span>
            <span>Last updated: {formatRelativeTime(profile.lastUpdatedAt)}</span>
            <span>{profile.updateCount} contributions</span>
          </div>
        </div>
      </div>

      {/* About */}
      {profile.about && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="font-semibold mb-3">About</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{profile.about}</p>
        </div>
      )}

      {/* Experience */}
      {employers.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Experience
          </h2>
          <div className="space-y-4">
            {employers.map((emp) => (
              <div key={emp.id} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  {emp.logoUrl ? (
                    <img src={emp.logoUrl} alt="" className="w-8 h-8 object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{emp.title || "Employee"}</p>
                  <p className="text-sm text-muted-foreground">{emp.company}</p>
                  {emp.isCurrent && (
                    <Badge variant="secondary" className="mt-1">
                      Current
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contribution History - GitHub Style */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Contribution History
          </h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {pendingCount} pending
            </Badge>
          )}
        </div>

        {contributions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No contributions yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contributions.map((contribution) => {
              const isExpanded = expandedContributions.has(contribution.id);
              const styles = STATUS_STYLES[contribution.status];

              return (
                <div key={contribution.id} className="group">
                  {/* Contribution Header */}
                  <button
                    onClick={() => toggleExpanded(contribution.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`${styles.bg} ${styles.text} border-0`}
                        variant="outline"
                      >
                        {contribution.status}
                      </Badge>
                      <span className="font-medium">
                        {FIELD_LABELS[contribution.field] || contribution.field}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(contribution.createdAt)}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Expanded Content - GitHub Diff Style */}
                  {isExpanded && (
                    <div className="p-4 bg-muted/30 border-t border-border space-y-4">
                      {/* Diff View */}
                      <div className="rounded-md border border-border overflow-hidden">
                        <div className="bg-green-500/10 p-3 border-b border-border">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">+ New Value</span>
                          </div>
                          <pre className="mt-2 text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap font-mono">
                            {formatValue(contribution.value)}
                          </pre>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          Contributed by: {contribution.contributedBy.slice(0, 8)}...
                        </span>
                        {contribution.resolvedBy && (
                          <span>
                            Resolved by: {contribution.resolvedBy.slice(0, 8)}... at{" "}
                            {new Date(contribution.resolvedAt!).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Actions for Pending */}
                      {contribution.status === "pending" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <button
                            onClick={() => handleResolve(contribution.id, "accept")}
                            disabled={isResolving === contribution.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleResolve(contribution.id, "reject")}
                            disabled={isResolving === contribution.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
