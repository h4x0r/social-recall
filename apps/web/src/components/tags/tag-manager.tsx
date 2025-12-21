"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2, Tag } from "lucide-react";
import { createTagRepository, type Tag as TagType } from "@/lib/tag-repository";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function TagManager() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[5]);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { user } = useAuth();
  const repository = createTagRepository(supabase);

  const loadTags = useCallback(async () => {
    if (!user) return;
    try {
      const loadedTags = await repository.listTags(user.id);
      setTags(loadedTags);
    } catch (error) {
      console.error("Failed to load tags:", error);
    } finally {
      setIsLoading(false);
    }
  }, [repository, user]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !user) return;

    setIsCreating(true);
    try {
      const newTag = await repository.createTag({
        userId: user.id,
        name: newTagName.trim(),
        color: selectedColor,
      });
      setTags([...tags, newTag]);
      setNewTagName("");
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await repository.deleteTag(tagId);
      setTags(tags.filter((t) => t.id !== tagId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading tags...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create new tag */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-display text-lg mb-4">Create New Tag</h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateTag();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleCreateTag}
            disabled={!newTagName.trim() || isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-1">Create</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                selectedColor === color
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Tag list */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-display text-lg mb-4">Your Tags</h3>
        {tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tags yet</p>
            <p className="text-sm">Create your first tag above to organize contacts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <Badge
                  variant="outline"
                  className="text-sm"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                </Badge>
                <div className="flex items-center gap-2">
                  {deleteConfirmId === tag.id ? (
                    <>
                      <span className="text-sm text-muted-foreground">
                        Delete this tag?
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTag(tag.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirmId(tag.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
