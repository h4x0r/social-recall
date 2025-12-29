/**
 * DOM extraction functions for LinkedIn profile data
 * Extracts profile information directly from the rendered DOM
 */

import type { Employer, Education, Volunteering, Certification, Activity, Project } from './types';
import { logger } from './logger';

/**
 * Strip notification badge numbers from names
 * LinkedIn sometimes prefixes names with "(1)" or "(99+)" notifications
 */
export function stripNotificationBadge(name: string): string {
  // Remove notification badge like "(1) " or "(99+) " from start of name
  return name.replace(/^\(\d+\+?\)\s*/, '').trim();
}

/**
 * Extract the profile name from the DOM
 */
export function extractName(): string {
  // Try various selectors LinkedIn uses for the profile name
  const selectors = [
    'h1.text-heading-xlarge',
    'h1.inline.t-24.v-align-middle.break-words',
    '.pv-top-card--list li:first-child',
    '.text-heading-xlarge',
    'h1[data-generated-suggestion-target]',
    // Profile card name
    '.pv-text-details__left-panel h1',
    '.ph5 h1',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      const name = el.textContent.trim();
      logger.debug('Found name with selector:', selector, '→', name);
      return stripNotificationBadge(name);
    }
  }

  // Fallback to page title
  logger.debug('Name not found in DOM, using page title fallback');
  const title = document.title;
  const parts = title.split(/\s[|–-]\s/);
  return stripNotificationBadge(parts[0]?.trim() || 'Unknown');
}

/**
 * Extract the profile headline from the DOM
 */
export function extractHeadline(): string | undefined {
  const headlineEl = document.querySelector('.text-body-medium.break-words');
  return headlineEl?.textContent?.trim();
}

/**
 * Extract the profile location from the DOM
 */
export function extractLocation(): string | undefined {
  // LinkedIn shows location in the profile header, usually after headline
  // Try various selectors LinkedIn uses for location
  const selectors = [
    // Primary location text
    '.pv-text-details__left-panel span.text-body-small',
    '.text-body-small.inline.t-black--light.break-words',
    // Location in profile card
    '.pv-top-card--list.pv-top-card--list-bullet li:nth-child(1)',
    // Alternative profile structure
    'span[class*="text-body-small"][class*="t-black--light"]',
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent?.trim();
      // Location text is typically not too long and doesn't contain certain patterns
      if (text && text.length > 2 && text.length < 100) {
        // Skip if it looks like a connection count or follower count
        if (/^\d+[\d,]*\s*(connections?|followers?)$/i.test(text)) continue;
        // Skip if it's a pronoun indicator
        if (/^\([^)]+\)$/.test(text)) continue;
        // Skip if it looks like a link text
        if (text.includes('linkedin.com')) continue;
        // Location often contains a comma (City, State/Country) or is a single place
        logger.debug('Found location:', text);
        return text;
      }
    }
  }

  logger.debug('Location not found');
  return undefined;
}

/**
 * Extract the profile avatar URL from the DOM
 */
export function extractAvatarUrl(): string | undefined {
  const avatarImg = document.querySelector('.pv-top-card-profile-picture__image') as HTMLImageElement;
  return avatarImg?.src;
}

/**
 * Find a LinkedIn profile section by its header text
 * Uses multiple strategies to locate sections in LinkedIn's DOM
 */
export function findSectionByHeader(headerText: string): Element | null {
  const searchText = headerText.toLowerCase();

  // Strategy 1: Find pv-profile-card__anchor with id containing section name
  // LinkedIn uses <div id="experience" class="pv-profile-card__anchor"> inside sections
  const anchor = document.querySelector(`div.pv-profile-card__anchor[id*="${searchText}" i], [id*="${searchText}" i].pv-profile-card__anchor`);
  if (anchor) {
    const section = anchor.closest('section');
    if (section) {
      logger.debug(`Found "${headerText}" via pv-profile-card__anchor id`);
      return section;
    }
  }

  // Strategy 2: Find any element with id containing section name
  const byId = document.querySelector(`section[id*="${searchText}" i], div[id*="${searchText}" i]`);
  if (byId) {
    const section = byId.tagName === 'SECTION' ? byId : byId.closest('section');
    if (section) {
      logger.debug(`Found "${headerText}" via id attribute`);
      return section;
    }
  }

  // Strategy 3: Find section with data-view-name="profile-card" that contains matching text
  const profileCards = document.querySelectorAll('section[data-view-name="profile-card"]');
  for (const card of profileCards) {
    // Check first few spans for header text
    const spans = card.querySelectorAll('span[aria-hidden="true"]');
    for (let i = 0; i < Math.min(5, spans.length); i++) {
      const text = spans[i].textContent?.trim().toLowerCase();
      if (text === searchText || text?.startsWith(searchText)) {
        logger.debug(`Found "${headerText}" via profile-card data-view-name`);
        return card;
      }
    }
  }

  // Strategy 4: Search all artdeco-card sections for header text in any span
  const artdecoSections = document.querySelectorAll('main section.artdeco-card');
  for (const section of artdecoSections) {
    // Check visually-hidden elements (screen reader text often has section names)
    const srOnly = section.querySelector('.visually-hidden, .sr-only, [class*="visually-hidden"]');
    if (srOnly?.textContent?.toLowerCase().includes(searchText)) {
      logger.debug(`Found "${headerText}" via visually-hidden text`);
      return section;
    }

    // Check first few spans for header text
    const spans = section.querySelectorAll('span[aria-hidden="true"], span.t-bold');
    for (let i = 0; i < Math.min(10, spans.length); i++) {
      const text = spans[i].textContent?.trim().toLowerCase();
      if (text === searchText || text?.startsWith(searchText)) {
        logger.debug(`Found "${headerText}" via artdeco-card span`);
        return section;
      }
    }
  }

  // Strategy 5: Find any section containing an h2/div with the header text
  const allSections = document.querySelectorAll('section');
  for (const section of allSections) {
    // Check h2 elements
    const h2 = section.querySelector('h2');
    if (h2?.textContent?.trim().toLowerCase().includes(searchText)) {
      logger.debug(`Found "${headerText}" via section h2`);
      return section;
    }
    // Check first few text elements - including deeper nesting
    const firstSpans = section.querySelectorAll('div span[aria-hidden="true"]');
    for (let i = 0; i < Math.min(5, firstSpans.length); i++) {
      if (firstSpans[i].textContent?.trim().toLowerCase() === searchText) {
        logger.debug(`Found "${headerText}" via section span`);
        return section;
      }
    }
  }

  // Strategy 6: TreeWalker to find the exact text anywhere
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode.textContent?.trim().toLowerCase() === searchText) {
      const parent = walker.currentNode.parentElement;
      const section = parent?.closest('section');
      if (section) {
        logger.debug(`Found "${headerText}" via TreeWalker text search`);
        return section;
      }
    }
  }

  // Strategy 7: Find div with pvs-list that's preceded by the header text
  const allSpans = document.querySelectorAll('span[aria-hidden="true"]');
  for (const span of allSpans) {
    if (span.textContent?.trim().toLowerCase() === searchText) {
      // Found the header text, now find its containing section
      const section = span.closest('section');
      if (section) {
        logger.debug(`Found "${headerText}" via span search`);
        return section;
      }
    }
  }

  logger.debug(`Could not find "${headerText}" section`);
  return null;
}

/**
 * Check if a string looks like a valid company name
 */
function isValidCompanyName(name: string): boolean {
  if (!name || name.length < 2) return false;

  const lowerName = name.toLowerCase();

  // Skip education-like entries
  if (/^(bachelor|master|doctor|j\.?d\.?|m\.?d\.?|ph\.?d\.?|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|m\.?b\.?a\.?)/i.test(name)) {
    return false;
  }

  // Skip connection degree indicators
  if (/^·\s*(1st|2nd|3rd)$/i.test(name)) {
    return false;
  }

  // Skip follower counts
  if (/^\d+[\d,]*\s*followers?$/i.test(name)) {
    return false;
  }

  // Skip if it's just a person's name (typically short, 1-3 words, no company indicators)
  // But be careful - some companies are named after people
  const words = name.split(/\s+/);
  if (words.length <= 2 && !lowerName.includes('inc') && !lowerName.includes('llc') &&
      !lowerName.includes('corp') && !lowerName.includes('company') &&
      !lowerName.includes('institute') && !lowerName.includes('group') &&
      !lowerName.includes('consulting') && !lowerName.includes('services') &&
      !lowerName.includes('solutions') && !lowerName.includes('partners')) {
    // Check if it looks like "FirstName LastName" or "FirstName L."
    if (/^[A-Z][a-z]+\s+[A-Z]\.?$/.test(name) || /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) {
      // Could be a person's name, skip unless it has company-like suffixes
      return false;
    }
  }

  // Skip degree fields and honors
  if (lowerName.includes('summa cum laude') || lowerName.includes('magna cum laude') ||
      lowerName.includes('cum laude') || lowerName.includes('phi beta kappa') ||
      lowerName.includes('legal studies') || lowerName.includes('computer science') ||
      lowerName.includes('business administration')) {
    return false;
  }

  // Skip job titles that got picked up
  if (/^(senior|junior|chief|vice|president|director|manager|engineer|developer|analyst|consultant|attorney|lawyer|counsel|partner|associate|intern)/i.test(name) &&
      !lowerName.includes('inc') && !lowerName.includes('llc') && !lowerName.includes('corp')) {
    return false;
  }

  // Skip discussion/podcast entries
  if (lowerName.includes('discussions from') || lowerName.includes('podcast')) {
    return false;
  }

  return true;
}

/**
 * Extract job title AND company name from an experience entry container
 * Returns { title, company } or null
 */
function extractExperienceFromContainer(container: Element): { title: string; company: string } | null {
  // LinkedIn's experience entry structure:
  // 1. Job title (first span, often in bold/mr-1 class)
  // 2. Company name (second span, often with " · Full-time" suffix)
  // 3. Date ranges, durations, locations (subsequent spans)

  const spans = container.querySelectorAll('span[aria-hidden="true"]');
  const texts: string[] = [];

  // Patterns to identify non-title/company text
  const datePattern = /^\w{3} \d{4}|^\d{4}\s*-|Present|\d+\s*(yr|yrs|mo|mos|year|month)/i;
  const locationPattern = /^(Remote|Hybrid|On-site)$|,\s*(Remote|Hybrid|On-site)$/i;
  const employmentTypes = ['full-time', 'part-time', 'contract', 'freelance', 'self-employed', 'internship', 'apprenticeship', 'seasonal'];

  for (const span of spans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 2 || text.length > 100) continue;

    // Skip dates, durations, locations
    if (datePattern.test(text)) continue;
    if (text.includes(' · ') && /\d+\s*(yr|mo)/i.test(text)) continue;
    if (locationPattern.test(text)) continue;
    if (text === 'Experience' || text === 'Skills' || text.includes('endorsement')) continue;

    texts.push(text);
  }

  if (texts.length < 2) return null;

  // First text is typically the job title
  const title = texts[0];

  // Second text is typically company (may have " · Full-time" suffix)
  let company = texts[1];

  // Clean up company name - remove employment type suffix
  if (company.includes(' · ')) {
    const parts = company.split(' · ');
    const suffix = parts[1]?.toLowerCase() || '';
    if (employmentTypes.some(type => suffix.includes(type))) {
      company = parts[0].trim();
    }
  }

  // Validate we have both
  if (title && company && title.length > 1 && company.length > 1) {
    return { title, company };
  }

  return null;
}

/**
 * Extract company name from a list item element
 */
function extractCompanyNameFromItem(item: Element): string | null {
  // Modern LinkedIn structure: spans with aria-hidden="true" contain text
  // Order is typically: [title, company, duration, location, ...]
  // We need the SECOND span which is the company name
  const spans = item.querySelectorAll('span[aria-hidden="true"]');
  const texts: string[] = [];

  for (const span of spans) {
    const text = span.textContent?.trim();
    if (text && text.length > 1) {
      // Skip if it looks like a date range
      if (/^\w{3} \d{4}/.test(text) || /^\d{4}\s*-/.test(text) || text.includes('Present')) {
        continue;
      }
      // Skip if it looks like a location with a bullet separator
      if (/^\d+\s*(yr|mo|day)/.test(text) || /·.*yr/.test(text)) {
        continue;
      }
      texts.push(text);
    }
  }

  // Modern layout: first is title, second is company
  // Try to find company name - it's usually the second valid text
  if (texts.length >= 2) {
    const potentialCompany = texts[1];

    // Clean up company name (remove " · Full-time" etc.)
    const company = potentialCompany.split(' · ')[0].trim();

    if (isValidCompanyName(company) && company.length > 1 && company.length < 100) {
      return company;
    }
  }

  // Fallback: try all texts
  for (const text of texts) {
    const company = text.split(' · ')[0].trim();
    if (isValidCompanyName(company) && company.length > 1 && company.length < 100) {
      return company;
    }
  }

  return null;
}

/**
 * Extract employers from a container element
 */
export function extractEmployersFromContainer(container: Element, employers: Employer[], seen: Set<string>): void {
  // Find list items within the container
  const items = container.querySelectorAll('li[class*="pvs-list__item"], li[class*="artdeco-list__item"], li');

  logger.debug(`extractEmployersFromContainer: Found ${items.length} list items`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const companyName = extractCompanyNameFromItem(item);

    if (i < 5) {
      logger.debug(`Item ${i}: companyName="${companyName}"`);
    }

    if (companyName && !seen.has(companyName.toLowerCase())) {
      seen.add(companyName.toLowerCase());
      const logoImg = item.querySelector('img[width="48"], img[class*="entity-image"], img[src*="company-logo"]') as HTMLImageElement;
      employers.push({
        company: companyName,
        logo: logoImg?.src || '',
      });
    }
  }

  logger.debug(`extractEmployersFromContainer: Extracted ${employers.length} employers`);
}

/**
 * Extract employers from the LinkedIn profile DOM
 */
export function extractEmployers(): Employer[] {
  const employers: Employer[] = [];
  const seen = new Set<string>();

  logger.debug('extractEmployers: Starting extraction...');

  // Try to find Experience section by header
  const experienceSection = findSectionByHeader('Experience');

  logger.debug('extractEmployers: experienceSection found:', !!experienceSection);

  // If found, extract from that section
  let searchContainer: Element | Document = experienceSection || document;
  let sectionFound = !!experienceSection;

  // Fallback: if no Experience section found, look for section with company logos in main
  if (!experienceSection) {
    const mainSections = document.querySelectorAll('main section');
    for (const section of mainSections) {
      const logos = section.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
      // If section has 2+ company logos and is below the top card, likely Experience
      if (logos.length >= 2) {
        const sectionRect = section.getBoundingClientRect();
        // Skip if it's at the very top (profile card area)
        if (sectionRect.top > 300) {
          logger.debug('Found Experience section by company logo pattern');
          searchContainer = section;
          sectionFound = true;
          break;
        }
      }
    }
  }

  if (sectionFound) {
    logger.debug('Extracting employers from section');
  } else {
    logger.debug('Experience section not found, searching entire main');
    searchContainer = document.querySelector('main') || document;
  }

  // Find all divs that look like experience entries
  const allDivs = searchContainer.querySelectorAll('div');

  for (const div of allDivs) {
    // Look for divs that contain company logo images
    const img = div.querySelector('img[src*="company-logo"], img[src*="shrink_100"]') as HTMLImageElement;
    if (!img) continue;

    // Make sure this div is a direct container (not a parent of many items)
    const nestedImgs = div.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
    if (nestedImgs.length > 1) continue; // Skip parent containers

    // Extract both title and company from this experience entry
    const experience = extractExperienceFromContainer(div);
    if (experience && !seen.has(experience.company.toLowerCase())) {
      seen.add(experience.company.toLowerCase());
      employers.push({
        company: experience.company,
        title: experience.title,
        logo: img.src || '',
      });
      logger.debug(`Found employer: ${experience.title} at ${experience.company}`);
    }
  }

  logger.debug('Extracted employers:', employers.length, employers.map(e => `${e.title} @ ${e.company}`));
  return employers;
}

/**
 * Extract the About section text
 */
export function extractAbout(): string | undefined {
  const aboutSection = findSectionByHeader('About');
  if (!aboutSection) return undefined;

  const textEl = aboutSection.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') ||
    aboutSection.querySelector('[class*="inline-show-more-text"] span[aria-hidden="true"]') ||
    aboutSection.querySelector('span[aria-hidden="true"]');
  const text = textEl?.textContent?.trim();

  // About text should be a meaningful description (at least 20 chars)
  // Filter out connection degree indicators like "2nd", "3rd", etc.
  if (!text || text.length < 20) return undefined;

  return text;
}

/**
 * Extract education entries from the profile
 */
export function extractEducation(): Education[] {
  const education: Education[] = [];
  const section = findSectionByHeader('Education');
  if (!section) {
    logger.debug('Education section not found');
    return education;
  }

  logger.debug('Found Education section');
  const seen = new Set<string>();

  // Find divs with school logo images (education entries have school logos)
  const allDivs = section.querySelectorAll('div');

  for (const div of allDivs) {
    // Look for divs containing education logo images
    const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]') as HTMLImageElement;
    if (!img) continue;

    // Skip parent containers with multiple images
    const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
    if (nestedImgs.length > 1) continue;

    // Extract education info from spans
    const spans = div.querySelectorAll('span[aria-hidden="true"]');
    let school = '';
    let degree = '';
    let field = '';
    let dates = '';

    for (const span of spans) {
      const text = span.textContent?.trim();
      if (!text) continue;

      // Date pattern: "1989 - 1992" or "2020 - Present"
      if (/^\d{4}\s*-\s*(\d{4}|Present)$/.test(text)) {
        dates = text;
        continue;
      }

      // School name is usually the first substantial text (often bold)
      if (!school && text.length > 2 && !text.includes(',')) {
        // Check if parent has bold styling
        const parentClasses = span.parentElement?.className || '';
        if (parentClasses.includes('bold') || parentClasses.includes('t-bold')) {
          school = text;
          continue;
        }
      }

      // Degree info often contains comma: "Bachelor's, Computer Science"
      if (!degree && text.includes(',')) {
        const parts = text.split(',').map(s => s.trim());
        degree = parts[0];
        field = parts.slice(1).join(', ');
        continue;
      }

      // If we don't have school yet, this might be it
      if (!school && text.length > 2 && text.length < 100) {
        school = text;
      }
    }

    if (school && !seen.has(school.toLowerCase())) {
      seen.add(school.toLowerCase());
      education.push({ school, degree, field, dates });
      logger.debug(`Found education: ${school}`);
    }
  }

  logger.debug('Extracted education:', education.length);
  return education;
}

/**
 * Extract skills from the profile
 */
export function extractSkills(): string[] {
  const skills: string[] = [];
  const section = findSectionByHeader('Skills');
  if (!section) {
    logger.debug('Skills section not found');
    return skills;
  }

  logger.debug('Found Skills section');
  const seen = new Set<string>();

  // Skills are typically displayed with bold text for the skill name
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 2) continue;

    // Skip UI elements
    if (text.includes('Show all') || text.includes('endorsement')) continue;

    // Skip if it looks like a number (endorsement count)
    if (/^\d+$/.test(text)) continue;

    if (text.length < 60 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      skills.push(text);
      logger.debug(`Found skill: ${text}`);
    }
  }

  // Fallback: look for any span that might be a skill name in list items
  if (skills.length === 0) {
    const listItems = section.querySelectorAll('li span[aria-hidden="true"]');
    for (const span of listItems) {
      const text = span.textContent?.trim();
      if (!text || text.length < 2 || text.length > 60) continue;
      if (text.includes('Show all') || text.includes('endorsement')) continue;
      if (/^\d+$/.test(text)) continue;

      if (!seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        skills.push(text);
      }
    }
  }

  logger.debug('Extracted skills:', skills.length, skills.slice(0, 5));
  return skills;
}

/**
 * Extract certifications from the profile
 */
export function extractCertifications(): Certification[] {
  const certifications: Certification[] = [];
  const section = findSectionByHeader('Licenses') || findSectionByHeader('Certifications');
  if (!section) {
    logger.debug('Certifications section not found');
    return certifications;
  }

  logger.debug('Found Certifications section');
  const seen = new Set<string>();

  // Find divs with certification logos
  const allDivs = section.querySelectorAll('div');

  for (const div of allDivs) {
    const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]') as HTMLImageElement;
    if (!img) continue;

    const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
    if (nestedImgs.length > 1) continue;

    const spans = div.querySelectorAll('span[aria-hidden="true"]');
    let name = '';
    let issuer = '';
    let issueDate: string | undefined;

    for (const span of spans) {
      const text = span.textContent?.trim();
      if (!text) continue;

      // Issue date pattern: "Issued Jun 2023" or "Jun 2023"
      if (text.startsWith('Issued ')) {
        issueDate = text.replace('Issued ', '');
        continue;
      }
      if (/^[A-Z][a-z]{2} \d{4}$/.test(text)) {
        issueDate = text;
        continue;
      }

      // First substantial text is likely the certification name
      if (!name && text.length > 2) {
        const parentClasses = span.parentElement?.className || '';
        if (parentClasses.includes('bold') || parentClasses.includes('t-bold')) {
          name = text;
          continue;
        }
      }

      // Issuer is typically second
      if (name && !issuer && text.length > 2) {
        issuer = text;
        continue;
      }

      if (!name && text.length > 2 && text.length < 100) {
        name = text;
      }
    }

    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      certifications.push({ name, issuer, issueDate });
      logger.debug(`Found certification: ${name}`);
    }
  }

  logger.debug('Extracted certifications:', certifications.length);
  return certifications;
}

/**
 * Extract volunteering experience from the profile
 */
export function extractVolunteering(): Volunteering[] {
  const volunteering: Volunteering[] = [];
  const section = findSectionByHeader('Volunteer');
  if (!section) {
    logger.debug('Volunteer section not found');
    return volunteering;
  }

  logger.debug('Found Volunteer section');
  const seen = new Set<string>();

  // Find divs with organization logos or volunteer entries
  const allDivs = section.querySelectorAll('div');

  for (const div of allDivs) {
    // Look for entries (may or may not have images)
    const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]') as HTMLImageElement;

    // For volunteering, we might not always have images, so check for text patterns too
    const spans = div.querySelectorAll('span[aria-hidden="true"]');
    if (spans.length < 2) continue; // Need at least role/org

    // Skip nested containers
    if (img) {
      const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
      if (nestedImgs.length > 1) continue;
    }

    let role = '';
    let organization = '';
    const cause = '';

    for (const span of spans) {
      const text = span.textContent?.trim();
      if (!text || text.length < 2) continue;

      // Skip date ranges
      if (/^\w{3} \d{4}\s*-/.test(text) || /^\d+\s*(yr|mo)/.test(text)) {
        continue;
      }

      // Role is typically bold
      if (!role) {
        const parentClasses = span.parentElement?.className || '';
        if (parentClasses.includes('bold') || parentClasses.includes('t-bold')) {
          role = text;
          continue;
        }
      }

      // Organization comes after role
      if (role && !organization && text.length > 2) {
        organization = text;
        continue;
      }

      // If no role yet, first text might be it
      if (!role && text.length > 2 && text.length < 80) {
        role = text;
      }
    }

    const key = `${role}-${organization}`.toLowerCase();
    if ((role || organization) && !seen.has(key)) {
      seen.add(key);
      volunteering.push({ organization, role, cause });
      logger.debug(`Found volunteering: ${role} at ${organization}`);
    }
  }

  logger.debug('Extracted volunteering:', volunteering.length);
  return volunteering;
}

/**
 * Extract activities (posts) from the profile
 */
export function extractActivities(): Activity[] {
  const activities: Activity[] = [];
  const MAX_ACTIVITIES = 20;

  const activitySection = findSectionByHeader('Activity');
  if (!activitySection) {
    logger.debug('Activity section not found on main page');
    return activities;
  }

  logger.debug('Found Activity section on profile page');
  const seen = new Set<string>();

  // LinkedIn Activity section often uses a carousel with cards
  // Look for text content in various places
  const postTexts = activitySection.querySelectorAll('span[aria-hidden="true"], .update-components-text, .feed-shared-text');

  // Debug: show what we're finding
  const allTexts = Array.from(postTexts).slice(0, 10).map(el => el.textContent?.trim().slice(0, 50));
  logger.debug('Activity section text samples:', allTexts);

  for (const span of postTexts) {
    if (activities.length >= MAX_ACTIVITIES) break;
    const text = span.textContent?.trim();

    // Skip UI elements and short text
    if (!text || text.length < 20) continue;
    if (text.includes('Show all') || text.includes('follower') || text.includes('reaction')) continue;
    if (/^\d+\s*(reactions?|comments?|reposts?)$/.test(text)) continue;

    // Deduplicate
    const textLower = text.toLowerCase();
    if (seen.has(textLower)) continue;
    seen.add(textLower);

    activities.push({
      type: 'post',
      text: text.slice(0, 500),
    });
    logger.debug(`Found activity post: ${text.slice(0, 50)}...`);
  }

  logger.debug(`Extracted ${activities.length} posts from profile Activity section`);
  return activities;
}

/**
 * Extract recommendations from the profile
 */
export function extractRecommendations(): string[] {
  const recommendations: string[] = [];
  const MAX_RECOMMENDATIONS = 10;

  const section = findSectionByHeader('Recommendations');
  if (!section) {
    logger.debug('Recommendations section not found');
    return recommendations;
  }

  logger.debug('Found Recommendations section');
  const seen = new Set<string>();

  // Look for recommendation text content
  const textElements = section.querySelectorAll('span[aria-hidden="true"]');

  for (const element of textElements) {
    if (recommendations.length >= MAX_RECOMMENDATIONS) break;
    const text = element.textContent?.trim();

    // Skip UI elements and short text
    if (!text || text.length < 50) continue;
    if (text.includes('Show all') || text.includes('Received') || text.includes('Given')) continue;
    if (/^\d+$/.test(text)) continue;

    // Skip recommender names (usually short and capitalized)
    if (text.length < 100 && /^[A-Z][a-z]+ [A-Z]/.test(text)) continue;

    // Deduplicate
    const textLower = text.toLowerCase();
    if (seen.has(textLower)) continue;
    seen.add(textLower);

    recommendations.push(text.slice(0, 1000));
  }

  logger.debug(`Extracted ${recommendations.length} recommendations`);
  return recommendations;
}

/**
 * Extract publications from the profile
 */
export function extractPublications(): string[] {
  const publications: string[] = [];

  const section = findSectionByHeader('Publications');
  if (!section) {
    return publications;
  }

  logger.debug('Found Publications section');
  const seen = new Set<string>();

  // Look for publication titles (usually in bold spans)
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 5 || text.length > 200) continue;
    if (text.includes('Show all')) continue;

    const textLower = text.toLowerCase();
    if (!seen.has(textLower)) {
      seen.add(textLower);
      publications.push(text);
    }
  }

  logger.debug(`Extracted ${publications.length} publications`);
  return publications;
}

/**
 * Extract organizations/memberships from the profile
 */
export function extractOrganizations(): string[] {
  const organizations: string[] = [];

  const section = findSectionByHeader('Organizations');
  if (!section) {
    return organizations;
  }

  logger.debug('Found Organizations section');
  const seen = new Set<string>();

  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 2 || text.length > 150) continue;
    if (text.includes('Show all')) continue;

    const textLower = text.toLowerCase();
    if (!seen.has(textLower)) {
      seen.add(textLower);
      organizations.push(text);
    }
  }

  logger.debug(`Extracted ${organizations.length} organizations`);
  return organizations;
}

/**
 * Extract interests (influencers, companies, groups, schools they follow)
 */
export function extractInterests(): string[] {
  const interests: string[] = [];

  const section = findSectionByHeader('Interests');
  if (!section) {
    return interests;
  }

  logger.debug('Found Interests section');
  const seen = new Set<string>();

  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 2 || text.length > 150) continue;
    if (text.includes('Show all') || text.includes('follower')) continue;

    const textLower = text.toLowerCase();
    if (!seen.has(textLower)) {
      seen.add(textLower);
      interests.push(text);
    }
  }

  logger.debug(`Extracted ${interests.length} interests`);
  return interests;
}

/**
 * Extract honors and awards from the profile
 */
export function extractHonorsAwards(): string[] {
  const awards: string[] = [];
  const section = findSectionByHeader('Honors') || findSectionByHeader('Awards');
  if (!section) return awards;

  const seen = new Set<string>();
  // Look for bold text in the section (award names are typically bold)
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (text && text.length > 2 && text.length < 100 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      awards.push(text);
    }
  }

  return awards;
}

/**
 * Extract courses from the profile
 */
export function extractCourses(): string[] {
  const courses: string[] = [];
  const section = findSectionByHeader('Courses');
  if (!section) return courses;

  const seen = new Set<string>();
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    if (text && text.length > 2 && text.length < 100 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      courses.push(text);
    }
  }

  return courses;
}

/**
 * Extract languages from the profile
 */
export function extractLanguages(): string[] {
  const languages: string[] = [];
  const section = findSectionByHeader('Languages');
  if (!section) return languages;

  const seen = new Set<string>();
  const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');

  for (const span of boldSpans) {
    const text = span.textContent?.trim();
    // Language names are short
    if (text && text.length > 1 && text.length < 50 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      languages.push(text);
    }
  }

  return languages;
}

/**
 * Extract test scores (GMAT, GRE, etc.)
 */
export function extractTestScores(): string[] {
  const testScores: string[] = [];

  const section = findSectionByHeader('Test Scores') || findSectionByHeader('Scores');
  if (!section) {
    return testScores;
  }

  logger.debug('Found Test Scores section');

  // Look for score-related text
  const spans = section.querySelectorAll('span[aria-hidden="true"]');
  for (const span of spans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 3) continue;
    if (text.includes('Show all')) continue;

    // Look for patterns like "GMAT: 750" or "GRE Verbal: 165"
    if (/\d/.test(text) && (text.includes(':') || text.includes('-') || /^\d+$/.test(text) === false)) {
      testScores.push(text);
    }
  }

  logger.debug(`Extracted ${testScores.length} test scores`);
  return testScores;
}

/**
 * Extract services offered (for creator/business profiles)
 */
export function extractServices(): string[] {
  const services: string[] = [];

  const section = findSectionByHeader('Services') || findSectionByHeader('Open to');
  if (!section) {
    return services;
  }

  logger.debug('Found Services section');
  const seen = new Set<string>();

  const spans = section.querySelectorAll('span[aria-hidden="true"]');
  for (const span of spans) {
    const text = span.textContent?.trim();
    if (!text || text.length < 3 || text.length > 200) continue;
    if (text.includes('Show all')) continue;

    const textLower = text.toLowerCase();
    if (!seen.has(textLower)) {
      seen.add(textLower);
      services.push(text);
    }
  }

  logger.debug(`Extracted ${services.length} services`);
  return services;
}

/**
 * Extract projects from the profile
 */
export function extractProjects(): Project[] {
  const projects: Project[] = [];

  const section = findSectionByHeader('Projects');
  if (!section) {
    logger.debug('Projects section not found');
    return projects;
  }

  logger.debug('Found Projects section');
  const seen = new Set<string>();

  // Find project entries (divs with project info)
  const allDivs = section.querySelectorAll('div');

  for (const div of allDivs) {
    const spans = div.querySelectorAll('span[aria-hidden="true"]');
    if (spans.length < 1) continue;

    // Skip nested containers
    const nestedDivs = div.querySelectorAll('div');
    if (nestedDivs.length > 10) continue;

    let name = '';
    let description = '';

    for (const span of spans) {
      const text = span.textContent?.trim();
      if (!text || text.length < 2) continue;

      // Skip common non-project text
      if (/^\w{3} \d{4}|Present|\d+\s*(yr|mo)/i.test(text)) continue;
      if (text.includes('Show all') || text === 'Projects') continue;

      // First substantial text is likely the project name
      if (!name && text.length > 2 && text.length < 100) {
        name = text;
        continue;
      }

      // Second text might be description
      if (name && !description && text.length > 10 && text.length < 500) {
        description = text;
        break;
      }
    }

    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      projects.push({ name, description: description || undefined });
      logger.debug(`Found project: ${name}`);
    }
  }

  logger.debug(`Extracted ${projects.length} projects`);
  return projects;
}
