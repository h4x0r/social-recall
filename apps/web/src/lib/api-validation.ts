/**
 * API Input Validation Schemas
 * Uses Zod for runtime validation with strict limits to prevent abuse
 */

import { z } from 'zod';

// API limits - centralized constants for all validation
export const API_LIMITS = {
  MAX_NOTE_LENGTH: 5000,
  MAX_NAME_LENGTH: 200,
  MAX_HEADLINE_LENGTH: 500,
  MAX_URL_LENGTH: 500,
  MAX_COMPANY_LENGTH: 200,
  MAX_TITLE_LENGTH: 200,
  MAX_LOCATION_LENGTH: 200,
  MAX_ABOUT_LENGTH: 5000,
  MAX_EMPLOYERS_PER_CONTACT: 50,
  MAX_EDUCATION_PER_CONTACT: 20,
  MAX_CERTIFICATIONS_PER_CONTACT: 50,
  MAX_SKILLS_PER_CONTACT: 100,
  MAX_LANGUAGES_PER_CONTACT: 20,
  MAX_PROJECTS_PER_CONTACT: 50,
  MAX_PUBLICATIONS_PER_CONTACT: 50,
  MAX_SERVICES_PER_CONTACT: 20,
  MAX_WEBSITES_PER_CONTACT: 20,
  MAX_CONTACTS_PER_BATCH: 100,
  MAX_HISTORY_ENTRIES_PER_REQUEST: 50,
} as const;

// Helper for non-empty trimmed strings
const nonEmptyString = (maxLength: number) =>
  z.string().min(1).max(maxLength).transform((s) => s.trim()).refine((s) => s.length > 0, {
    message: 'String cannot be empty or whitespace only',
  });

// LinkedIn URL validation
const linkedInUrl = z.string().max(API_LIMITS.MAX_URL_LENGTH).refine(
  (url) => /linkedin\.com\/in\//.test(url),
  { message: 'Must be a valid LinkedIn profile URL' }
);

// Employer schema
const employerSchema = z.object({
  company: z.string().min(1).max(API_LIMITS.MAX_COMPANY_LENGTH),
  logo: z.string().max(API_LIMITS.MAX_URL_LENGTH).optional().default(''),
  title: z.string().max(API_LIMITS.MAX_TITLE_LENGTH).optional(),
  isCurrent: z.boolean().optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
});

// Education schema
const educationSchema = z.object({
  school: z.string().min(1).max(200),
  degree: z.string().max(200).optional(),
  field: z.string().max(200).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
});

// Certification schema
const certificationSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().max(200).optional(),
  issueDate: z.string().max(50).optional(),
  expirationDate: z.string().max(50).optional(),
});

// Project schema
const projectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().max(API_LIMITS.MAX_URL_LENGTH).optional(),
});

// Publication schema
const publicationSchema = z.object({
  title: z.string().min(1).max(500),
  publisher: z.string().max(200).optional(),
  url: z.string().max(API_LIMITS.MAX_URL_LENGTH).optional(),
  date: z.string().max(50).optional(),
});

// Service schema
const serviceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

// Website schema
const websiteSchema = z.object({
  label: z.string().max(100).optional(),
  url: z.string().min(1).max(API_LIMITS.MAX_URL_LENGTH),
});

// Note schemas
export const createNoteSchema = z.object({
  contactId: z.string().min(1).optional(),
  linkedinId: z.string().min(1).max(200).optional(),
  content: nonEmptyString(API_LIMITS.MAX_NOTE_LENGTH),
}).refine(
  (data) => data.contactId || data.linkedinId,
  { message: 'Either contactId or linkedinId is required' }
);

export const updateNoteSchema = z.object({
  noteId: z.string().min(1),
  content: nonEmptyString(API_LIMITS.MAX_NOTE_LENGTH),
});

export const deleteNoteSchema = z.object({
  noteId: z.string().min(1),
});

// Contact sync schemas
export const syncContactSchema = z.object({
  profileId: z.string().min(1).max(200),
  name: z.string().min(1).max(API_LIMITS.MAX_NAME_LENGTH),
  url: linkedInUrl,
  headline: z.string().max(API_LIMITS.MAX_HEADLINE_LENGTH).optional(),
  location: z.string().max(API_LIMITS.MAX_LOCATION_LENGTH).optional(),
  avatarUrl: z.string().max(API_LIMITS.MAX_URL_LENGTH).optional(),
  about: z.string().max(API_LIMITS.MAX_ABOUT_LENGTH).optional(),
  employers: z.array(employerSchema).max(API_LIMITS.MAX_EMPLOYERS_PER_CONTACT).optional(),
  education: z.array(educationSchema).max(API_LIMITS.MAX_EDUCATION_PER_CONTACT).optional(),
  certifications: z.array(certificationSchema).max(API_LIMITS.MAX_CERTIFICATIONS_PER_CONTACT).optional(),
  skills: z.array(z.string().max(100)).max(API_LIMITS.MAX_SKILLS_PER_CONTACT).optional(),
  languages: z.array(z.string().max(100)).max(API_LIMITS.MAX_LANGUAGES_PER_CONTACT).optional(),
  projects: z.array(projectSchema).max(API_LIMITS.MAX_PROJECTS_PER_CONTACT).optional(),
  publications: z.array(publicationSchema).max(API_LIMITS.MAX_PUBLICATIONS_PER_CONTACT).optional(),
  services: z.array(serviceSchema).max(API_LIMITS.MAX_SERVICES_PER_CONTACT).optional(),
  websites: z.array(websiteSchema).max(API_LIMITS.MAX_WEBSITES_PER_CONTACT).optional(),
  note: z.string().max(API_LIMITS.MAX_NOTE_LENGTH).optional(),
});

export const syncBatchSchema = z.object({
  contacts: z.array(syncContactSchema).min(1).max(API_LIMITS.MAX_CONTACTS_PER_BATCH).optional(),
  contact: syncContactSchema.optional(),
}).refine(
  (data) => (data.contacts && data.contacts.length > 0) || data.contact,
  { message: 'Either contacts array or single contact is required' }
);

// History sync schemas
export const historyEntrySchema = z.object({
  field: z.enum(['name', 'headline', 'location', 'employers', 'education']),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  detectedAt: z.string(),
});

export const syncHistorySchema = z.object({
  profileId: z.string().min(1).max(200),
  entries: z.array(historyEntrySchema).max(API_LIMITS.MAX_HISTORY_ENTRIES_PER_REQUEST),
});

// Type exports for use in API routes
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;
export type SyncContactInput = z.infer<typeof syncContactSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
export type HistoryEntryInput = z.infer<typeof historyEntrySchema>;
export type SyncHistoryInput = z.infer<typeof syncHistorySchema>;

/**
 * Helper to validate and return typed result or error response
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Zod v4 uses 'issues' instead of 'errors'
  const issues = result.error.issues || [];
  const errorMessages = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
  return { success: false, error: `Validation failed: ${errorMessages}` };
}
