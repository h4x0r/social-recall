import { describe, it, expect } from 'vitest';
import { isAnalysisStale } from './profile-intelligence';

describe('isAnalysisStale', () => {
  it('returns true when ai_analyzed_at is null (never analyzed)', () => {
    const profile = {
      last_updated_at: new Date('2025-01-01T00:00:00Z'),
      ai_analyzed_at: null,
    };

    expect(isAnalysisStale(profile)).toBe(true);
  });

  it('returns true when profile updated after analysis', () => {
    const profile = {
      last_updated_at: new Date('2025-01-02T00:00:00Z'),
      ai_analyzed_at: new Date('2025-01-01T00:00:00Z'),
    };

    expect(isAnalysisStale(profile)).toBe(true);
  });

  it('returns false when analysis is newer than profile update', () => {
    const profile = {
      last_updated_at: new Date('2025-01-01T00:00:00Z'),
      ai_analyzed_at: new Date('2025-01-02T00:00:00Z'),
    };

    expect(isAnalysisStale(profile)).toBe(false);
  });

  it('returns false when timestamps are equal', () => {
    const profile = {
      last_updated_at: new Date('2025-01-01T00:00:00Z'),
      ai_analyzed_at: new Date('2025-01-01T00:00:00Z'),
    };

    expect(isAnalysisStale(profile)).toBe(false);
  });

  it('handles string timestamps', () => {
    const profile = {
      last_updated_at: '2025-01-02T00:00:00Z',
      ai_analyzed_at: '2025-01-01T00:00:00Z',
    };

    expect(isAnalysisStale(profile)).toBe(true);
  });
});
