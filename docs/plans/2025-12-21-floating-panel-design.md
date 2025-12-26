# Floating Intelligence Panel Design

**Date:** 2025-12-21
**Status:** Complete (TDD, 711 tests passing - 163 extension, 548 web)

## Overview

Redesigned browser extension for serial entrepreneurs/integrators who need network intelligence at a glance. Transforms from "LinkedIn note widget" to "secret weapon for network intelligence."

## Target Audience

Serial entrepreneurs, angel investors, VCs, and business integrators who:
- Need to track skills of people they know
- Want to spot opportunities when contacts change jobs
- Maintain weak ties in their network

## Core Design Decisions

### 1. Robocop Mode (Frictionless Capture)
- No save button required
- Auto-captures every LinkedIn profile viewed
- Background script records all data on page load
- Job changes detected automatically from historical snapshots

### 2. Instant Intelligence (First Impression)
When popup/panel opens, immediately shows:
- **Skills** - AI-inferred from headline/experience
- **Archetype** - Builder, Architect, Designer, etc.
- **Could Be** - Relationship potential (Co-founder, Advisor, Contractor)
- **Good For** - Project/domain fit (Dev tools, Fintech, etc.)
- **Job Change Alert** - Red signal when employer changed since last seen

### 3. Tarot Card Archetypes
9 archetypes mapped to tarot cards for memorable visual identity:

| Archetype | Tarot Card | Description |
|-----------|------------|-------------|
| Builder | The Magician | Ships production systems |
| Architect | The Emperor | Designs, advises on structure |
| Designer | The Empress | UX/UI, experience |
| Scientist | The Hermit | ML, research, data |
| Strategist | The Chariot | Leadership, fundraising |
| Seller | Strength | Sales, BD, deals |
| Marketer | The Star | Growth, brand, content |
| Connector | The Lovers | Partnerships, community |
| Specialist | High Priestess | Deep domain expert |

### 4. Floating Panel UX
- Draggable floating panel (not popup)
- Always visible on LinkedIn profiles
- Minimizes to small orb icon
- Pulses gold when job change detected
- High-contrast split design: dark header/footer, cream content

### 5. Art Deco Visual Design
- **Colors:** Charcoal (#1a1a1a), cream (#f5f2eb), antique gold (#c9a227)
- **Typography:** Playfair Display (display), DM Sans (body)
- **Details:** Geometric borders, gold accents, layered shadows
- **Tarot:** 48px simplified art deco icon, full RWS on hover tooltip

### 6. Hybrid Onboarding ("Taste, then Gate")
Free tier allows 10 profiles before requiring account creation.

**Phase 1: First 10 profiles**
- Full intelligence panel works
- Subtle counter in footer: "3 of 10 free profiles"
- No friction, full experience

**Phase 2: Profile 11+ (Gate)**
- Panel shows signup gate instead of intelligence
- Value props for both extension AND web app:

| Category | Value Props |
|----------|-------------|
| **Extension** | Unlimited connections, Never lose your network |
| **Web App** | Search "Who can help with X?", Dashboard of all contacts, Relationship management, Full CRM features |

- Single CTA: "Continue with Google"
- Art deco styling maintained (diamond borders)

**Why this approach:**
- Low friction start demonstrates value
- Gate appears when user is invested (10 profiles)
- Shows full ecosystem value, not just extension features
- Honest about what requires account vs. what's free locally

### 7. AI-Powered Intelligence

Uses Vercel AI Gateway with Claude Haiku 3.5 for intelligent inference:

**Architecture:**
```
Extension Content Script
    ↓
AI Client (src/ai-client.ts)
    ↓
Web App API (/api/infer-skills)
    ↓
Vercel AI Gateway → Claude Haiku 3.5
```

**Inference Output:**
- **Skills**: 3-10 specific skills with confidence scores (e.g., "Kubernetes Security" 0.9)
- **Archetype**: One of 9 archetypes based on primary professional identity
- **Could Be**: 1-3 relationship potentials (Co-founder, Tech Advisor, etc.)
- **Good For**: 1-3 project/domain fits (Dev tools, Fintech, etc.)

**Fallback Strategy:**
- If AI API unavailable or times out (5s), falls back to local keyword heuristics
- AI results cached per profile to avoid re-inferring on subsequent visits
- Cost: ~$0.001/profile via Vercel AI Gateway

## Files Created

### Extension (`apps/extension/src/`)
| File | Purpose |
|------|---------|
| `panel.ts` | Panel component with state, toggle, intelligence display |
| `panel.test.ts` | 28 TDD tests for panel functionality |
| `panel.css` | Art deco styling with CSS variables |
| `content.ts` | Content script with AI integration and fallback |
| `ai-client.ts` | API client for AI inference |
| `ai-client.test.ts` | 10 tests for AI client |
| `onboarding.ts` | Profile count and gate logic |
| `onboarding.test.ts` | 16 tests for onboarding |

### Web App (`apps/web/src/`)
| File | Purpose |
|------|---------|
| `app/api/infer-skills/route.ts` | AI inference API endpoint |
| `app/api/infer-skills/route.test.ts` | 12 tests for API |

## Test Coverage

**Extension (163 tests):**
- Panel creation, toggle, intelligence display
- Job change alerts
- Drag functionality
- AI client with timeout handling
- Onboarding and gate logic
- Keyboard shortcuts (m/n/Escape)
- Profile scraping
- Notes display from backend

**Web App (548 tests):**
- AI inference API
- Contact management
- Authentication
- Sync features
- Notes API (CRUD operations)
- Contact consolidation
- Admin portal

## Next Steps

1. ~~Add RWS tarot card images to `/tarot/` directory~~ ✓ Done
2. ~~Implement AI-powered skill inference~~ ✓ Done
3. ~~Add note input UI to expanded panel~~ ✓ Done
4. ~~Build sync between extension and web app~~ ✓ Done
5. ~~Add keyboard shortcuts for power users~~ ✓ Done

### Keyboard Shortcuts (Added 2025-12-23)

| Key | Action |
|-----|--------|
| `M` | Toggle minimize/expand panel |
| `N` | Open note input (when expanded) |
| `Escape` | Close note input, or minimize panel |

Shortcuts are ignored when typing in input fields or textareas.
