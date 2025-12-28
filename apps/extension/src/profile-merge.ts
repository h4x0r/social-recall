/**
 * Profile merge utility functions
 * Handles archetype validation and fallback intelligence inference
 */

import { Archetype } from './panel';

// Define a minimal profile type for inference functions
interface PartialProfile {
  name?: string;
  headline?: string;
  about?: string;
  employers?: unknown[];
  education?: unknown[];
}

/**
 * Valid archetypes in the current set (11 core + unknown)
 */
export const VALID_ARCHETYPES = new Set([
  Archetype.Builder,
  Archetype.Advisor,
  Archetype.Creator,
  Archetype.Executive,
  Archetype.Connector,
  Archetype.Operator,
  Archetype.Seller,
  Archetype.Researcher,
  Archetype.Integrator,
  Archetype.Evangelist,
  Archetype.Investor,
  Archetype.Unknown,
]);

/**
 * Check if an archetype is valid
 */
export function isValidArchetype(archetype: Archetype | undefined): boolean {
  return archetype !== undefined && VALID_ARCHETYPES.has(archetype);
}

/**
 * Fallback archetype when AI inference unavailable
 * AI handles real archetype inference - this is just a placeholder fallback
 */
export function inferArchetype(_data: PartialProfile): Archetype {
  return Archetype.Unknown;
}

/**
 * Fallback relationship types when AI inference unavailable
 * AI handles real relationship inference - this is just a placeholder fallback
 */
export function inferCouldBe(_data: PartialProfile): string[] {
  return [];
}

/**
 * Fallback project fit when AI inference unavailable
 * AI handles real industry/project inference - this is just a placeholder fallback
 */
export function inferGoodFor(_data: PartialProfile): string[] {
  return [];
}
