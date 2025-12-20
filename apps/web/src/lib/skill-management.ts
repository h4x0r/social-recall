/**
 * Skill management for contacts
 * Handles confirming, rejecting, and manually adding skills
 */

export type SkillStatus = 'pending' | 'confirmed' | 'rejected' | 'manual';

export interface ManagedSkill {
  name: string;
  category: string;
  confidence: number;
  status: SkillStatus;
}

export interface ContactSkills {
  contactId: string;
  confirmed: ManagedSkill[];
  rejected: ManagedSkill[];
  pending: ManagedSkill[];
  manual: ManagedSkill[];
}

export interface InferredSkill {
  name: string;
  category: string;
  confidence: number;
}

export interface ManualSkillInput {
  name: string;
  category: string;
}

const STORAGE_KEY = 'social-recall:contact-skills';

// In-memory cache
const skillsCache = new Map<string, ContactSkills>();

/**
 * Gets or initializes skills for a contact
 */
export function getContactSkills(
  contactId: string,
  inferredSkills?: InferredSkill[]
): ContactSkills {
  // Check cache first
  let skills = skillsCache.get(contactId);

  if (!skills) {
    skills = {
      contactId,
      confirmed: [],
      rejected: [],
      pending: [],
      manual: [],
    };
    skillsCache.set(contactId, skills);
  }

  // If inferred skills provided and no pending skills exist, initialize them
  if (inferredSkills && inferredSkills.length > 0 && skills.pending.length === 0) {
    // Only add skills that aren't already in any category
    const existingNames = new Set([
      ...skills.confirmed.map((s) => s.name),
      ...skills.rejected.map((s) => s.name),
      ...skills.manual.map((s) => s.name),
    ]);

    const newPending = inferredSkills
      .filter((s) => !existingNames.has(s.name))
      .map((s) => ({
        ...s,
        status: 'pending' as SkillStatus,
      }));

    skills.pending = [...skills.pending, ...newPending];
    skillsCache.set(contactId, skills);
    saveSkillsToStorage();
  }

  return skills;
}

/**
 * Finds a skill across all categories
 */
function findSkill(
  skills: ContactSkills,
  skillName: string
): { skill: ManagedSkill; category: 'pending' | 'confirmed' | 'rejected' | 'manual' } | null {
  const pending = skills.pending.find((s) => s.name === skillName);
  if (pending) return { skill: pending, category: 'pending' };

  const confirmed = skills.confirmed.find((s) => s.name === skillName);
  if (confirmed) return { skill: confirmed, category: 'confirmed' };

  const rejected = skills.rejected.find((s) => s.name === skillName);
  if (rejected) return { skill: rejected, category: 'rejected' };

  const manual = skills.manual.find((s) => s.name === skillName);
  if (manual) return { skill: manual, category: 'manual' };

  return null;
}

/**
 * Removes a skill from its current category
 */
function removeFromCategory(
  skills: ContactSkills,
  skillName: string,
  category: 'pending' | 'confirmed' | 'rejected' | 'manual'
): void {
  skills[category] = skills[category].filter((s) => s.name !== skillName);
}

/**
 * Confirms a skill (moves from pending to confirmed)
 */
export function confirmSkill(contactId: string, skillName: string): ContactSkills {
  const skills = getContactSkills(contactId);
  const found = findSkill(skills, skillName);

  if (!found) {
    throw new Error('Skill not found');
  }

  // If already confirmed, return as-is
  if (found.category === 'confirmed') {
    return skills;
  }

  // Remove from current category
  removeFromCategory(skills, skillName, found.category);

  // Add to confirmed
  const confirmedSkill: ManagedSkill = {
    ...found.skill,
    status: 'confirmed',
  };
  skills.confirmed.push(confirmedSkill);

  skillsCache.set(contactId, skills);
  saveSkillsToStorage();

  return skills;
}

/**
 * Rejects a skill (moves to rejected)
 */
export function rejectSkill(contactId: string, skillName: string): ContactSkills {
  const skills = getContactSkills(contactId);
  const found = findSkill(skills, skillName);

  if (!found) {
    throw new Error('Skill not found');
  }

  // If already rejected, return as-is
  if (found.category === 'rejected') {
    return skills;
  }

  // Remove from current category
  removeFromCategory(skills, skillName, found.category);

  // Add to rejected
  const rejectedSkill: ManagedSkill = {
    ...found.skill,
    status: 'rejected',
  };
  skills.rejected.push(rejectedSkill);

  skillsCache.set(contactId, skills);
  saveSkillsToStorage();

  return skills;
}

/**
 * Adds a manually specified skill
 */
export function addManualSkill(
  contactId: string,
  input: ManualSkillInput
): ContactSkills {
  const skills = getContactSkills(contactId);
  const found = findSkill(skills, input.name);

  if (found) {
    throw new Error('Skill already exists');
  }

  const manualSkill: ManagedSkill = {
    name: input.name,
    category: input.category,
    confidence: 1.0,
    status: 'manual',
  };

  skills.manual.push(manualSkill);
  skillsCache.set(contactId, skills);
  saveSkillsToStorage();

  return skills;
}

/**
 * Saves all skills to localStorage
 */
export function saveSkillsToStorage(): void {
  try {
    const data: Record<string, ContactSkills> = {};
    skillsCache.forEach((skills, contactId) => {
      data[contactId] = skills;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads skills from localStorage
 */
export function loadSkillsFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as Record<string, ContactSkills>;
      Object.entries(data).forEach(([contactId, skills]) => {
        skillsCache.set(contactId, skills);
      });
    }
  } catch {
    // Handle corrupted data gracefully
  }
}

/**
 * Clears the skills cache (for testing)
 */
export function clearSkillsCache(): void {
  skillsCache.clear();
}

/**
 * Gets all active skills (confirmed + manual) for display
 */
export function getActiveSkills(contactId: string): ManagedSkill[] {
  const skills = getContactSkills(contactId);
  return [...skills.confirmed, ...skills.manual];
}

/**
 * Checks if a contact has pending skills to review
 */
export function hasPendingSkills(contactId: string): boolean {
  const skills = getContactSkills(contactId);
  return skills.pending.length > 0;
}
