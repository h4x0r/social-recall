"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { MatchResult } from "@/lib/contact-matcher";
import type { FieldSelection } from "@/lib/contact-consolidation";

interface MergeDialogProps {
  match: MatchResult;
  isOpen: boolean;
  onClose: () => void;
  onMerge: (match: MatchResult, selections: FieldSelection[]) => void;
}

interface FieldConfig {
  field: string;
  label: string;
  linkedinValue: string | null | undefined;
  googleValue: string | null | undefined;
}

type SourceType = "linkedin" | "google" | "custom";

export function MergeDialog({ match, isOpen, onClose, onMerge }: MergeDialogProps) {
  const { linkedInContact, googleContact } = match;

  // Field configurations
  const fields: FieldConfig[] = [
    {
      field: "name",
      label: "Name",
      linkedinValue: linkedInContact.name,
      googleValue: googleContact.name,
    },
    {
      field: "email",
      label: "Email",
      linkedinValue: null, // LinkedIn doesn't provide email
      googleValue: googleContact.email,
    },
    {
      field: "phone",
      label: "Phone",
      linkedinValue: null, // LinkedIn doesn't provide phone
      googleValue: googleContact.phone,
    },
    {
      field: "headline",
      label: "Title",
      linkedinValue: linkedInContact.headline,
      googleValue: null, // Google doesn't have headline
    },
    {
      field: "company",
      label: "Company",
      linkedinValue: linkedInContact.employers?.[0]?.company,
      googleValue: googleContact.organization,
    },
  ];

  // State for selections
  const [selections, setSelections] = useState<Record<string, SourceType>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  // Initialize selections based on auto-select logic
  useEffect(() => {
    const initialSelections: Record<string, SourceType> = {};

    for (const field of fields) {
      if (field.linkedinValue && !field.googleValue) {
        initialSelections[field.field] = "linkedin";
      } else if (field.googleValue && !field.linkedinValue) {
        initialSelections[field.field] = "google";
      } else if (field.linkedinValue && field.googleValue) {
        // Default to LinkedIn when both have values
        initialSelections[field.field] = "linkedin";
      } else {
        // Neither has value, default to linkedin
        initialSelections[field.field] = "linkedin";
      }
    }

    setSelections(initialSelections);
  }, [match]);

  const handleSourceChange = (field: string, source: SourceType) => {
    setSelections((prev) => ({ ...prev, [field]: source }));
  };

  const handleCustomChange = (field: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleMerge = () => {
    const fieldSelections: FieldSelection[] = fields.map((f) => ({
      field: f.field,
      source: selections[f.field] || "auto",
      linkedinValue: f.linkedinValue,
      googleValue: f.googleValue,
      customValue: selections[f.field] === "custom" ? customValues[f.field] : undefined,
    }));

    onMerge(match, fieldSelections);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Merge Contact</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="p-4 space-y-4">
          {fields.map((field) => (
            <div key={field.field} className="border-b border-border pb-4 last:border-0">
              <div className="font-medium mb-2">{field.label}</div>

              <div className="space-y-2">
                {/* LinkedIn option */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.field}
                    value="linkedin"
                    checked={selections[field.field] === "linkedin"}
                    onChange={() => handleSourceChange(field.field, "linkedin")}
                    className="accent-primary"
                  />
                  <span className="text-sm">
                    {field.linkedinValue || "(none)"}
                  </span>
                  <span className="text-xs text-muted-foreground">(LinkedIn)</span>
                </label>

                {/* Google option */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.field}
                    value="google"
                    checked={selections[field.field] === "google"}
                    onChange={() => handleSourceChange(field.field, "google")}
                    className="accent-primary"
                  />
                  <span className="text-sm">
                    {field.googleValue || "(none)"}
                  </span>
                  <span className="text-xs text-muted-foreground">(Google)</span>
                </label>

                {/* Custom option */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.field}
                    value="custom"
                    checked={selections[field.field] === "custom"}
                    onChange={() => handleSourceChange(field.field, "custom")}
                    className="accent-primary"
                  />
                  <input
                    type="text"
                    placeholder="Custom value..."
                    value={customValues[field.field] || ""}
                    onChange={(e) => handleCustomChange(field.field, e.target.value)}
                    onFocus={() => handleSourceChange(field.field, "custom")}
                    className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded-md"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Merge Contact
          </button>
        </div>
      </div>
    </div>
  );
}
