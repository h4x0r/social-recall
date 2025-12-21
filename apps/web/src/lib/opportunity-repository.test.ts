/**
 * Tests for opportunity repository
 * TDD: RED phase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOpportunityRepository, OpportunityRepository } from './opportunity-repository';
import type { OpportunityType } from './opportunities';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
};

// Helper to create chainable mock
function createQueryMock(returnValue: unknown) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
  };
  return mock;
}

describe('OpportunityRepository', () => {
  let repository: OpportunityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createOpportunityRepository(mockSupabaseClient as never);
  });

  describe('createOpportunity', () => {
    it('creates an opportunity from detection result', async () => {
      const mockOpportunity = {
        id: 'opp-123',
        contact_id: 'contact-456',
        type: 'new_company' as OpportunityType,
        description: 'Started new role at TechCorp',
        detected_at: '2024-01-15T10:00:00Z',
        dismissed: false,
        snoozed_until: null,
        created_at: '2024-01-15T10:00:00Z',
      };

      const queryMock = createQueryMock({ data: mockOpportunity, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await repository.createOpportunity({
        contactId: 'contact-456',
        type: 'new_company',
        description: 'Started new role at TechCorp',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('opportunities');
      expect(queryMock.insert).toHaveBeenCalledWith({
        contact_id: 'contact-456',
        type: 'new_company',
        description: 'Started new role at TechCorp',
      });
      expect(result.id).toBe('opp-123');
      expect(result.type).toBe('new_company');
    });

    it('throws error on database failure', async () => {
      const queryMock = createQueryMock({ data: null, error: { message: 'Database error' } });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await expect(
        repository.createOpportunity({
          contactId: 'contact-456',
          type: 'new_company',
          description: 'Test',
        })
      ).rejects.toThrow('Failed to create opportunity');
    });
  });

  describe('detectAndCreateOpportunities', () => {
    it('detects new company and creates opportunity', async () => {
      const mockOpportunity = {
        id: 'opp-123',
        contact_id: 'contact-456',
        type: 'new_company' as OpportunityType,
        description: 'Started new role at NewCorp',
        detected_at: '2024-01-15T10:00:00Z',
        dismissed: false,
        snoozed_until: null,
        created_at: '2024-01-15T10:00:00Z',
      };

      const queryMock = createQueryMock({ data: mockOpportunity, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const before = {
        id: 'contact-456',
        name: 'Sarah Chen',
        employers: [{ company: 'OldCorp', logo: '' }],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const after = {
        ...before,
        employers: [
          { company: 'NewCorp', logo: '' },
          { company: 'OldCorp', logo: '' },
        ],
        updatedAt: '2024-02-01',
      };

      const opportunities = await repository.detectAndCreateOpportunities(before, after);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].type).toBe('new_company');
    });

    it('returns empty array when no changes detected', async () => {
      const contact = {
        id: 'contact-456',
        name: 'John Doe',
        employers: [{ company: 'SameCorp', logo: '' }],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const opportunities = await repository.detectAndCreateOpportunities(contact, contact);

      expect(opportunities).toHaveLength(0);
    });
  });
});
