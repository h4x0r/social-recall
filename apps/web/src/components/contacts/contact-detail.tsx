"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotes } from "@/hooks/use-notes";
import { useRelationship } from "@/hooks/use-relationship";
import { useSkillInference } from "@/hooks/use-skill-inference";
import { useSkillManagement } from "@/hooks/use-skill-management";
import {
  formatRelationshipLabel,
  RELATIONSHIP_TYPE_CONFIG,
  RELATIONSHIP_TYPES,
  STRENGTH_LABELS,
} from "@/lib/relationship";
import type { RelationshipType } from "@/lib/database.types";
import { ContactPicker } from "./contact-picker";
import { TagSelector } from "../tags/tag-selector";
import {
  Sparkles,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Building2,
  StickyNote,
  ThumbsUp,
  ThumbsDown,
  UserPlus,
  Calendar,
  Handshake,
  Briefcase,
  GraduationCap,
  Mail,
  Link,
  Users,
  Star,
  Tag,
} from "lucide-react";

interface Employer {
  company: string;
  logo: string;
}

interface Contact {
  id: string;
  name: string;
  headline: string | null;
  employers: Employer[];
  skills: string[];
  lastUpdated: string;
  isNew: boolean;
}

interface ContactDetailProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetail({ contact, open, onOpenChange }: ContactDetailProps) {
  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <ContactHeader contact={contact} />
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            <TagsSection contactId={contact.id} />
            <Separator />
            <RelationshipSection contactId={contact.id} />
            <Separator />
            <EmployersSection employers={contact.employers} />
            <Separator />
            <SkillsSection contact={contact} />
            <Separator />
            <NotesSection contactId={contact.id} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ContactHeader({ contact }: { contact: Contact }) {
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-start gap-4">
      <Avatar className="h-16 w-16 border border-border">
        <AvatarFallback className="bg-secondary font-display text-lg">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <DialogTitle className="font-display text-2xl leading-tight">
          {contact.name}
        </DialogTitle>
        {contact.headline && (
          <p className="text-muted-foreground mt-1">{contact.headline}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2 font-data">
          Last updated: {contact.lastUpdated}
        </p>
      </div>
    </div>
  );
}

function TagsSection({ contactId }: { contactId: string }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Tag className="h-4 w-4" />
        Tags
      </h3>
      <TagSelector contactId={contactId} />
    </div>
  );
}

function EmployersSection({ employers }: { employers: Employer[] }) {
  if (employers.length === 0) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Building2 className="h-4 w-4" />
        Employment History
      </h3>
      <div className="flex flex-wrap gap-2">
        {employers.map((employer, index) => (
          <div
            key={`${employer.company}-${index}`}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-xs font-bold">
              {employer.company[0]}
            </div>
            <span className="text-sm">{employer.company}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Icon mapping for relationship types
const RELATIONSHIP_ICONS: Record<RelationshipType, React.ReactNode> = {
  intro: <UserPlus className="h-4 w-4" />,
  conference: <Calendar className="h-4 w-4" />,
  worked_together: <Building2 className="h-4 w-4" />,
  co_investor: <Handshake className="h-4 w-4" />,
  portfolio: <Briefcase className="h-4 w-4" />,
  advisor: <GraduationCap className="h-4 w-4" />,
  cold_outreach: <Mail className="h-4 w-4" />,
  other: <Link className="h-4 w-4" />,
};

function RelationshipSection({ contactId }: { contactId: string }) {
  const {
    relationship,
    isLoading,
    isSaving,
    addRelationship,
    updateRelationship,
    deleteRelationship,
  } = useRelationship(contactId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    type: 'intro' as RelationshipType,
    context: '',
    sharedCompany: '',
    strength: 3,
    introducedById: null as string | null,
    introducedByName: null as string | null,
  });

  // Populate form when editing existing relationship
  const startEditing = () => {
    if (relationship) {
      setFormData({
        type: relationship.type,
        context: relationship.context || '',
        sharedCompany: relationship.sharedCompany || '',
        strength: relationship.strength,
        introducedById: relationship.introducedById || null,
        introducedByName: relationship.introducedByName || null,
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    const input = {
      type: formData.type,
      context: formData.context || null,
      sharedCompany: formData.sharedCompany || null,
      introducedById: formData.type === 'intro' ? formData.introducedById : null,
      strength: formData.strength,
    };

    try {
      if (relationship) {
        await updateRelationship(input);
      } else {
        await addRelationship(input);
      }
      setIsEditing(false);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRelationship();
      setIsEditing(false);
    } catch {
      // Error is handled by the hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading relationship...</span>
      </div>
    );
  }

  // Editing/Adding form
  if (isEditing) {
    return (
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" />
          {relationship ? 'Edit Relationship' : 'How do you know them?'}
        </h3>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          {/* Relationship Type */}
          <div className="space-y-2">
            <Label htmlFor="relationship-type">Connection Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as RelationshipType })
              }
            >
              <SelectTrigger id="relationship-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <span className={RELATIONSHIP_TYPE_CONFIG[type].color}>
                        {RELATIONSHIP_ICONS[type]}
                      </span>
                      <span>{RELATIONSHIP_TYPE_CONFIG[type].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {RELATIONSHIP_TYPE_CONFIG[formData.type].description}
            </p>
          </div>

          {/* Introducer picker - shown when type is intro */}
          {formData.type === 'intro' && (
            <div className="space-y-2">
              <Label>Who Introduced You?</Label>
              <ContactPicker
                onSelect={(id, name) =>
                  setFormData({
                    ...formData,
                    introducedById: id,
                    introducedByName: name,
                  })
                }
                selectedContactId={formData.introducedById}
                selectedContactName={formData.introducedByName}
                placeholder="Select the person who introduced you..."
                excludeIds={[contactId]}
              />
            </div>
          )}

          {/* Context field - changes based on type */}
          <div className="space-y-2">
            <Label htmlFor="context">
              {formData.type === 'conference'
                ? 'Event Name'
                : formData.type === 'cold_outreach'
                  ? 'Channel (LinkedIn, Email, etc.)'
                  : formData.type === 'other'
                    ? 'How did you meet?'
                    : 'Additional Context'}
            </Label>
            <Input
              id="context"
              placeholder={
                formData.type === 'conference'
                  ? 'e.g., TechCrunch Disrupt 2024'
                  : formData.type === 'cold_outreach'
                    ? 'e.g., LinkedIn'
                    : 'Optional details...'
              }
              value={formData.context}
              onChange={(e) =>
                setFormData({ ...formData, context: e.target.value })
              }
            />
          </div>

          {/* Shared Company - for relevant types */}
          {['worked_together', 'co_investor', 'portfolio', 'advisor'].includes(
            formData.type
          ) && (
            <div className="space-y-2">
              <Label htmlFor="shared-company">
                {formData.type === 'worked_together'
                  ? 'Company Name'
                  : formData.type === 'co_investor'
                    ? 'Investment'
                    : formData.type === 'portfolio'
                      ? 'Portfolio Company'
                      : 'Organization'}
              </Label>
              <Input
                id="shared-company"
                placeholder="Company name..."
                value={formData.sharedCompany}
                onChange={(e) =>
                  setFormData({ ...formData, sharedCompany: e.target.value })
                }
              />
            </div>
          )}

          {/* Relationship Strength */}
          <div className="space-y-2">
            <Label>Relationship Strength</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, strength: level })}
                  className={`flex items-center justify-center w-full h-10 rounded-md border transition-colors ${
                    formData.strength >= level
                      ? 'bg-amber-500/20 border-amber-500 text-amber-600'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <Star
                    className={`h-4 w-4 ${
                      formData.strength >= level ? 'fill-amber-500' : ''
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {STRENGTH_LABELS[formData.strength]}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {relationship && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" />
          How You Know Them
        </h3>
        {relationship && (
          <Button
            variant="ghost"
            size="sm"
            onClick={startEditing}
            className="h-7 text-xs"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {relationship ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${RELATIONSHIP_TYPE_CONFIG[relationship.type].color}`}
            >
              {RELATIONSHIP_ICONS[relationship.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{formatRelationshipLabel(relationship)}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {RELATIONSHIP_TYPE_CONFIG[relationship.type].label}
                </Badge>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Star
                      key={level}
                      className={`h-3 w-3 ${
                        relationship.strength >= level
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {STRENGTH_LABELS[relationship.strength]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="w-full justify-start"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add relationship context
        </Button>
      )}
    </div>
  );
}

function SkillsSection({ contact }: { contact: Contact }) {
  const { inferSkills, isLoading, error, skills: inferredSkills } = useSkillInference();
  const {
    skills: managedSkills,
    pendingCount,
    allActiveSkills,
    confirmSkill,
    rejectSkill,
    initializeWithInferred,
  } = useSkillManagement(contact.id);

  const handleInferSkills = async () => {
    await inferSkills({
      id: contact.id,
      name: contact.name,
      headline: contact.headline,
      employers: contact.employers,
    });
  };

  // When inference completes, initialize skill management with results
  if (inferredSkills && inferredSkills.length > 0 && pendingCount === 0 && allActiveSkills.length === 0) {
    initializeWithInferred(inferredSkills);
  }

  const hasNoSkills = allActiveSkills.length === 0 && pendingCount === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Skills
          {pendingCount > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">
              {pendingCount} to review
            </Badge>
          )}
        </h3>
        {!hasNoSkills && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleInferSkills}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                Re-infer
              </>
            )}
          </Button>
        )}
      </div>

      {/* Pending skills to review */}
      {managedSkills.pending.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Review AI-inferred skills:</p>
          <div className="space-y-2">
            {managedSkills.pending.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {skill.category}
                  </Badge>
                  <span className="text-sm font-medium">{skill.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(skill.confidence * 100)}%)
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => confirmSkill(skill.name)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => rejectSkill(skill.name)}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed and manual skills */}
      {allActiveSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allActiveSkills.map((skill) => (
            <Badge
              key={skill.name}
              variant={skill.status === 'manual' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {skill.name}
              {skill.status === 'confirmed' && (
                <Check className="h-3 w-3 text-green-600" />
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* No skills - show infer button */}
      {hasNoSkills && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInferSkills}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Inferring skills...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Infer Skills with AI
              </>
            )}
          </Button>
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      )}
    </div>
  );
}

function NotesSection({ contactId }: { contactId: string }) {
  const { notes, addNote, updateNote, deleteNote } = useNotes(contactId);
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      addNote(newNoteContent);
      setNewNoteContent("");
      setIsAdding(false);
    }
  };

  const handleStartEdit = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (editingNoteId && editContent.trim()) {
      updateNote(editingNoteId, editContent);
      setEditingNoteId(null);
      setEditContent("");
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <StickyNote className="h-4 w-4" />
          Notes ({notes.length})
        </h3>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add note form */}
      {isAdding && (
        <div className="mb-4 space-y-2">
          <Textarea
            placeholder="Write a note about this contact..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-[80px] resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewNoteContent("");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddNote}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="space-y-3">
        {notes.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground italic">
            No notes yet. Add a note to remember context about this contact.
          </p>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className="group rounded-lg border border-border bg-card p-3"
          >
            {editingNoteId === note.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground font-data">
                    {new Date(note.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleStartEdit(note.id, note.content)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
