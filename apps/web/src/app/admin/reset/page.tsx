"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Trash2, Download, RefreshCw } from "lucide-react";

interface Stats {
  contacts: number;
  history: number;
}

type ResetAction = "clear_history" | "clear_contacts" | "clear_all";

const ACTION_INFO: Record<
  ResetAction,
  { label: string; description: string; danger: "medium" | "high" }
> = {
  clear_history: {
    label: "Clear History",
    description: "Delete all profile change history. Contacts remain intact.",
    danger: "medium",
  },
  clear_contacts: {
    label: "Clear Contacts",
    description:
      "Delete all contacts. This will also delete associated history (cascade).",
    danger: "high",
  },
  clear_all: {
    label: "Reset Everything",
    description: "Delete all contacts and history. Complete data wipe.",
    danger: "high",
  },
};

export default function ResetPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<ResetAction | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setStats(await res.json());
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExport = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      // Fetch all data
      const [contactsRes, historyRes] = await Promise.all([
        supabase.from("contacts").select("*"),
        supabase.from("contact_history").select("*"),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        contacts: contactsRes.data || [],
        history: historyRes.data || [],
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `social-recall-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  const handleReset = async () => {
    if (!selectedAction || confirmation !== "DELETE") return;

    setIsDeleting(true);
    setResult(null);

    try {
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setResult({ success: false, message: "Not authenticated" });
        return;
      }

      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: selectedAction,
          confirm: "DELETE",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult({
          success: true,
          message: `Successfully deleted ${data.deleted} records`,
        });
        setSelectedAction(null);
        setConfirmation("");
        fetchStats(); // Refresh stats
      } else {
        setResult({
          success: false,
          message: data.error || "Delete operation failed",
        });
      }
    } catch (e) {
      setResult({
        success: false,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Data Management</h1>
        <p className="text-muted-foreground">
          Export data and perform bulk delete operations
        </p>
      </div>

      {/* Stats */}
      <div className="p-6 bg-card rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-4">Current Data</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-bold">{stats.contacts}</div>
              <div className="text-sm text-muted-foreground">Contacts</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats.history}</div>
              <div className="text-sm text-muted-foreground">History Entries</div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Failed to load stats</p>
        )}
      </div>

      {/* Export */}
      <div className="p-6 bg-card rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-2">Export Data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Download all contacts and history as JSON before making changes.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          <Download className="w-4 h-4" />
          Export All Data
        </button>
      </div>

      {/* Danger Zone */}
      <div className="p-6 bg-card rounded-lg border border-destructive/50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-semibold">Danger Zone</h2>
        </div>

        <div className="space-y-4">
          {(Object.entries(ACTION_INFO) as [ResetAction, typeof ACTION_INFO[ResetAction]][]).map(
            ([action, info]) => (
              <div
                key={action}
                className={`p-4 rounded-lg border ${
                  selectedAction === action
                    ? "border-destructive bg-destructive/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{info.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {info.description}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedAction(selectedAction === action ? null : action)
                    }
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      info.danger === "high"
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                  >
                    {selectedAction === action ? "Cancel" : "Select"}
                  </button>
                </div>

                {/* Confirmation UI */}
                {selectedAction === action && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-destructive mb-3">
                      Type <strong>DELETE</strong> to confirm this action:
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        placeholder="Type DELETE"
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                      />
                      <button
                        onClick={handleReset}
                        disabled={confirmation !== "DELETE" || isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        {isDeleting ? "Deleting..." : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Result message */}
        {result && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              result.success
                ? "bg-green-500/10 text-green-500"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
