"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTags } from "@/hooks/use-tags";
import { Plus, X, Tag, Check, Loader2 } from "lucide-react";
import type { Tag as TagType } from "@/lib/tag-repository";

interface TagSelectorProps {
  contactId: string;
}

// Predefined colors for tags
const TAG_COLORS = [
  "#6366f1", // indigo
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

export function TagSelector({ contactId }: TagSelectorProps) {
  const {
    tags: allTags,
    contactTags,
    isLoading,
    createTag,
    addTagToContact,
    removeTagFromContact,
  } = useTags({ contactId });

  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    const tag = await createTag({ name: newTagName.trim(), color: selectedColor });
    if (tag) {
      await addTagToContact(tag.id);
      setNewTagName("");
    }
    setIsCreating(false);
  };

  const handleToggleTag = async (tag: TagType) => {
    const isAssigned = contactTags.some((t) => t.id === tag.id);
    if (isAssigned) {
      await removeTagFromContact(tag.id);
    } else {
      await addTagToContact(tag.id);
    }
  };

  const unassignedTags = allTags.filter(
    (tag) => !contactTags.some((ct) => ct.id === tag.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading tags...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Display assigned tags */}
      <div className="flex flex-wrap items-center gap-2">
        {contactTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 pr-1"
            style={{ backgroundColor: tag.color + "20", borderColor: tag.color }}
          >
            <span style={{ color: tag.color }}>{tag.name}</span>
            <button
              onClick={() => removeTagFromContact(tag.id)}
              className="ml-1 rounded-full p-0.5 hover:bg-black/10"
            >
              <X className="h-3 w-3" style={{ color: tag.color }} />
            </button>
          </Badge>
        ))}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
              <Tag className="h-3 w-3" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              {/* Existing tags */}
              {unassignedTags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Add existing tag
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {unassignedTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        style={{ borderColor: tag.color }}
                        onClick={() => handleToggleTag(tag)}
                      >
                        <span style={{ color: tag.color }}>{tag.name}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Create new tag */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Create new tag
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateTag();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Color picker */}
                <div className="flex gap-1">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      className="h-5 w-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
