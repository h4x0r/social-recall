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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotes } from "@/hooks/use-notes";
import { useSkillInference } from "@/hooks/use-skill-inference";
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
} from "lucide-react";

interface Employer {
  company: string;
  logo: string;
}

interface Contact {
  id: string;
  name: string;
  headline: string;
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
        <p className="text-muted-foreground mt-1">{contact.headline}</p>
        <p className="text-xs text-muted-foreground mt-2 font-data">
          Last updated: {contact.lastUpdated}
        </p>
      </div>
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

function SkillsSection({ contact }: { contact: Contact }) {
  const [displaySkills, setDisplaySkills] = useState<string[]>(contact.skills);
  const { inferSkills, isLoading, error } = useSkillInference();

  const handleInferSkills = async () => {
    await inferSkills({
      id: contact.id,
      name: contact.name,
      headline: contact.headline,
      employers: contact.employers,
    });

    const cached = localStorage.getItem(`skills:${contact.id}`);
    if (cached) {
      const data = JSON.parse(cached);
      setDisplaySkills(data.skills.map((s: { name: string }) => s.name));
    }
  };

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Sparkles className="h-4 w-4" />
        Skills
      </h3>

      {displaySkills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {displaySkills.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>
      ) : (
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
