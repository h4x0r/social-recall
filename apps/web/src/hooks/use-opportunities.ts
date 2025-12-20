"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';
import { supabase, createOpportunityRepository } from '@/lib/supabase';
import type { Opportunity } from '@/lib/opportunity-repository';
import type { OpportunityType } from '@/lib/opportunities';

interface UseOpportunitiesOptions {
  type?: OpportunityType;
  limit?: number;
}

interface CountByType {
  new_company: number;
  role_change: number;
  left_job: number;
}

interface UseOpportunitiesReturn {
  opportunities: Opportunity[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  countByType: CountByType;
  refresh: () => Promise<void>;
  dismiss: (opportunityId: string) => Promise<void>;
  snooze: (opportunityId: string, days: number) => Promise<void>;
}

export function useOpportunities(options?: UseOpportunitiesOptions): UseOpportunitiesReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => createOpportunityRepository(supabase), []);

  const fetchOpportunities = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setOpportunities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedOpportunities = await repository.listOpportunities(user.id, {
        type: options?.type,
        limit: options?.limit,
      });
      setOpportunities(fetchedOpportunities);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch opportunities');
      setOpportunities([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, repository, options?.type, options?.limit]);

  // Fetch opportunities on mount and when dependencies change
  useEffect(() => {
    if (!authLoading) {
      fetchOpportunities();
    }
  }, [fetchOpportunities, authLoading]);

  const refresh = useCallback(async () => {
    await fetchOpportunities();
  }, [fetchOpportunities]);

  const dismiss = useCallback(async (opportunityId: string) => {
    try {
      await repository.dismissOpportunity(opportunityId);
      // Remove from local state
      setOpportunities((prev) => prev.filter((o) => o.id !== opportunityId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to dismiss opportunity');
    }
  }, [repository]);

  const snooze = useCallback(async (opportunityId: string, days: number) => {
    try {
      await repository.snoozeOpportunity(opportunityId, days);
      // Remove from local state (snoozed opportunities are hidden)
      setOpportunities((prev) => prev.filter((o) => o.id !== opportunityId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to snooze opportunity');
    }
  }, [repository]);

  const totalCount = opportunities.length;

  const countByType: CountByType = useMemo(() => {
    return opportunities.reduce(
      (acc, opp) => {
        acc[opp.type]++;
        return acc;
      },
      { new_company: 0, role_change: 0, left_job: 0 } as CountByType
    );
  }, [opportunities]);

  return {
    opportunities,
    isLoading: isLoading || authLoading,
    error,
    totalCount,
    countByType,
    refresh,
    dismiss,
    snooze,
  };
}
