"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { RefreshCw, Users, CloudDownload, AlertCircle } from "lucide-react";
import { MatchCard } from "@/components/contacts/match-card";
import { MergeDialog } from "@/components/contacts/merge-dialog";
import {
  type LinkedInContact,
  type GoogleContact,
  type FieldSelection,
} from "@/lib/contact-consolidation";
import type { MatchResult, MatchSignals } from "@/lib/contact-matcher";

interface ReviewState {
  currentIndex: number;
  totalContacts: number;
  reviewed: number;
}

interface PendingMatchData {
  id: string;
  linkedin_contact_id: string;
  google_resource_name: string;
  google_contact_data: {
    name: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    avatarUrl?: string;
    employers?: Array<{ company: string; title?: string }>;
  };
  score: number;
  signals: MatchSignals;
  status: string;
}

export default function ConsolidatePage() {
  const { user, isLoading: authLoading } = useAuth();

  const [linkedinContacts, setLinkedinContacts] = useState<Map<string, LinkedInContact>>(new Map());
  const [pendingMatches, setPendingMatches] = useState<Map<string, MatchResult[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>({
    currentIndex: 0,
    totalContacts: 0,
    reviewed: 0,
  });

  // Dialog state
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch LinkedIn contacts and pending matches from API
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }

      // Fetch LinkedIn contacts
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id, linkedin_id, name, headline, location") as {
          data: Array<{
            id: string;
            linkedin_id: string;
            name: string;
            headline?: string;
            location?: string;
          }> | null;
          error: Error | null
        };

      if (contactsError) throw contactsError;

      // Build LinkedIn contacts map
      const linkedInMap = new Map<string, LinkedInContact>();
      for (const c of contacts || []) {
        linkedInMap.set(c.id, {
          id: c.id,
          linkedinId: c.linkedin_id,
          name: c.name,
          headline: c.headline,
          location: c.location,
          employers: [],
        });
      }
      setLinkedinContacts(linkedInMap);

      // Fetch pending matches from API
      const response = await fetch("/api/contacts/pending-matches?status=pending", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pending matches");
      }

      const { matches } = await response.json() as { matches: PendingMatchData[] };

      // Transform pending matches to MatchResult format grouped by LinkedIn contact
      const grouped = new Map<string, MatchResult[]>();
      for (const match of matches) {
        const linkedInContact = linkedInMap.get(match.linkedin_contact_id);
        if (!linkedInContact) continue;

        // Determine confidence based on score
        const confidence: 'high' | 'medium' | 'low' = match.score >= 80 ? 'high' : match.score >= 50 ? 'medium' : 'low';

        const matchResult: MatchResult = {
          linkedInContact,
          googleContact: {
            resourceName: match.google_resource_name,
            name: match.google_contact_data.name,
            email: match.google_contact_data.email,
            phone: match.google_contact_data.phone,
            linkedinUrl: match.google_contact_data.linkedinUrl,
            organization: match.google_contact_data.employers?.[0]?.company,
          },
          score: match.score,
          confidence,
          signals: match.signals,
        };

        const key = match.linkedin_contact_id;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(matchResult);
      }

      setPendingMatches(grouped);
      setReviewState({
        currentIndex: 0,
        totalContacts: grouped.size,
        reviewed: 0,
      });
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

  // Get current LinkedIn contact being reviewed
  const currentLinkedinId = Array.from(pendingMatches.keys())[reviewState.currentIndex];
  const currentMatches = currentLinkedinId ? pendingMatches.get(currentLinkedinId) : [];
  const currentLinkedIn = currentMatches?.[0]?.linkedInContact;

  const handleSelectMatch = (match: MatchResult) => {
    setSelectedMatch(match);
    setIsDialogOpen(true);
  };

  const handleMerge = async (match: MatchResult, selections: FieldSelection[]) => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error("No session found");
        return;
      }

      const response = await fetch("/api/contacts/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          linkedinContactId: match.linkedInContact.id,
          googleContact: {
            resourceName: match.googleContact.resourceName,
            name: match.googleContact.name,
            email: match.googleContact.email,
            phone: match.googleContact.phone,
            organization: match.googleContact.organization,
          },
          fieldSelections: selections,
          matchScore: match.score,
          matchSignals: match.signals,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Merge failed:", error);
        return;
      }

      const result = await response.json();
      console.log("Contact merged successfully:", result);
    } catch (e) {
      console.error("Failed to merge contact:", e);
    }

    setIsDialogOpen(false);
    setSelectedMatch(null);

    // Move to next contact
    setReviewState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      reviewed: prev.reviewed + 1,
    }));
  };

  const updateMatchStatus = async (matchId: string, status: 'skipped' | 'rejected') => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error("No session found");
        return;
      }

      await fetch("/api/contacts/pending-matches", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ matchId, status }),
      });
    } catch (e) {
      console.error(`Failed to update match status to ${status}:`, e);
    }
  };

  const handleSkip = async () => {
    // Update all matches for this contact to skipped
    if (currentMatches) {
      for (const match of currentMatches) {
        await updateMatchStatus(match.googleContact.resourceName, 'skipped');
      }
    }

    setReviewState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
    }));
  };

  const handleNoMatch = async () => {
    // Mark all matches for this contact as rejected
    if (currentMatches) {
      for (const match of currentMatches) {
        await updateMatchStatus(match.googleContact.resourceName, 'rejected');
      }
    }

    setReviewState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      reviewed: prev.reviewed + 1,
    }));
  };

  const handleImportGoogle = async () => {
    setIsImporting(true);
    setImportError(null);

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setImportError("Please sign in to import contacts");
        setIsImporting(false);
        return;
      }

      // Check if we have Google provider token
      if (!session.provider_token) {
        // Need to re-authenticate with Google Contacts permission
        const { createAuthService } = await import("@/lib/auth");
        const authService = createAuthService(supabase);
        await authService.signInWithGoogle({ includeContacts: true });
        return;
      }

      // Call import API
      const response = await fetch("/api/contacts/import-google", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 && result.error?.includes("Google")) {
          // Re-authenticate with Google Contacts permission
          const { createAuthService } = await import("@/lib/auth");
          const authService = createAuthService(supabase);
          await authService.signInWithGoogle({ includeContacts: true });
          return;
        }
        throw new Error(result.error || "Import failed");
      }

      console.log("Import completed:", result);

      // Reload pending matches
      await loadData();
    } catch (e) {
      console.error("Failed to import Google contacts:", e);
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  const hasMoreToReview = reviewState.currentIndex < reviewState.totalContacts;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Consolidate Contacts</h1>
          <p className="text-muted-foreground">
            Match your LinkedIn contacts with Google Contacts to create a unified network.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {reviewState.reviewed} of {reviewState.totalContacts} contacts reviewed
              </span>
            </div>
            <button
              onClick={handleImportGoogle}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CloudDownload className="w-4 h-4" />
                  Import Google Contacts
                </>
              )}
            </button>
          </div>

          {/* Import error message */}
          {importError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {importError}
            </div>
          )}
        </div>

        {/* No matches state */}
        {!hasMoreToReview && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">No matches to review</h2>
            <p className="text-muted-foreground mb-4">
              {pendingMatches.size === 0 && linkedinContacts.size > 0
                ? "Import your Google Contacts to find potential matches."
                : "All contacts have been reviewed."}
            </p>
          </div>
        )}

        {/* Current contact review */}
        {hasMoreToReview && currentLinkedIn && (
          <div className="space-y-6">
            {/* LinkedIn contact card */}
            <div className="p-6 bg-card rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-2">LinkedIn Contact</div>
              <div className="font-semibold text-lg">{currentLinkedIn.name}</div>
              {currentLinkedIn.headline && (
                <div className="text-muted-foreground">{currentLinkedIn.headline}</div>
              )}
              {currentLinkedIn.location && (
                <div className="text-sm text-muted-foreground mt-1">{currentLinkedIn.location}</div>
              )}
            </div>

            {/* Potential matches */}
            <div>
              <div className="text-sm text-muted-foreground mb-3">
                Potential Matches from Google ({currentMatches?.length || 0} found)
              </div>
              <div className="space-y-3">
                {currentMatches?.map((match) => (
                  <MatchCard
                    key={match.googleContact.resourceName}
                    match={match}
                    onSelect={handleSelectMatch}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                onClick={handleNoMatch}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                None of these match
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Merge dialog */}
        {selectedMatch && (
          <MergeDialog
            match={selectedMatch}
            isOpen={isDialogOpen}
            onClose={() => {
              setIsDialogOpen(false);
              setSelectedMatch(null);
            }}
            onMerge={handleMerge}
          />
        )}
      </div>
    </div>
  );
}
