/**
 * React hook for managing a contact's relationship context
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createContactRepository,
  type Relationship,
  type RelationshipInput,
} from '@/lib/contact-repository';

export interface UseRelationshipResult {
  relationship: Relationship | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  addRelationship: (input: RelationshipInput) => Promise<void>;
  updateRelationship: (input: Partial<RelationshipInput>) => Promise<void>;
  deleteRelationship: () => Promise<void>;
}

export function useRelationship(contactId: string): UseRelationshipResult {
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = createContactRepository(supabase);

  // Load relationship on mount
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await repository.getRelationship(contactId);
        setRelationship(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load relationship');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [contactId]);

  const addRelationship = useCallback(
    async (input: RelationshipInput) => {
      try {
        setIsSaving(true);
        setError(null);
        const newRelationship = await repository.addRelationship(contactId, input);
        setRelationship(newRelationship);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add relationship');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [contactId]
  );

  const updateRelationship = useCallback(
    async (input: Partial<RelationshipInput>) => {
      if (!relationship) return;

      try {
        setIsSaving(true);
        setError(null);
        const updated = await repository.updateRelationship(relationship.id, input);
        setRelationship(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update relationship');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [relationship]
  );

  const deleteRelationship = useCallback(async () => {
    if (!relationship) return;

    try {
      setIsSaving(true);
      setError(null);
      await repository.deleteRelationship(relationship.id);
      setRelationship(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [relationship]);

  return {
    relationship,
    isLoading,
    isSaving,
    error,
    addRelationship,
    updateRelationship,
    deleteRelationship,
  };
}
