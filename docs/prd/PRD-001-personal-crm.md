# PRD-001: Personal CRM for Investors & Founders

| Field | Value |
|-------|-------|
| **Document ID** | PRD-001 |
| **Title** | Personal CRM with LinkedIn, Google, and iCloud Sync |
| **Author** | Product Team |
| **Status** | Draft |
| **Created** | 2025-12-20 |
| **Last Updated** | 2025-12-20 |
| **Target Release** | v1.0 (MVP) |

---

## 1. Problem Statement

### 1.1 Background

Investors, founders, and business integrators maintain large professional networks (1,000-10,000+ contacts) across multiple platforms. Their network IS their business — knowing "who can do X" or "who just became available" directly impacts deal flow, hiring, and partnerships.

### 1.2 Current Pain Points

1. **Fragmented contact data** — Contacts scattered across LinkedIn, Google Contacts, iCloud, and various CRMs with no unified view
2. **No skills visibility** — Existing tools track contact info but not capabilities ("who do I know that understands Kubernetes security?")
3. **Missed opportunities** — Career transitions (someone leaving BigCorp to start a company) go unnoticed until it's too late
4. **Wrong tool category** — Existing CRMs are sales-focused (pipeline, deals, revenue) which doesn't fit the integrator/investor workflow
5. **Manual data entry** — Adding and updating contacts requires tedious copy-paste between platforms

### 1.3 Problem Statement

> Business integrators need a "second brain" for their professional network that surfaces opportunities and capabilities, not sales pipelines.

---

## 2. Goals & Objectives

### 2.1 Product Vision

A personal CRM that turns your professional network into a queryable, opportunity-aware knowledge graph.

### 2.2 Primary Goals

| Goal | Success Metric |
|------|----------------|
| Unified contact view | 90%+ of user's professional contacts in one place |
| Skills discoverability | User can answer "who knows X?" in <30 seconds |
| Opportunity awareness | Career transitions surfaced within 7 days of detection |
| Reduced manual entry | <10 seconds to save a new LinkedIn contact |
| Cross-device access | Synced contacts appear in phone's native Contacts app |

### 2.3 Non-Goals (Explicit Exclusions)

- Sales pipeline management
- Email marketing / mass outreach
- Team collaboration (MVP is single-user)
- Calendar/meeting scheduling
- Full CRM suite (deals, revenue tracking, forecasting)

---

## 3. User Personas

### 3.1 Primary Persona: The Integrator

**Name:** Alex Chen
**Role:** Angel Investor & Startup Advisor
**Age:** 42
**Background:** Former security executive (IBM, Deloitte), now invests in and advises early-stage startups

**Behaviors:**
- Attends 3-5 networking events per month
- LinkedIn connections: 4,500+
- Makes 2-3 angel investments per year
- Frequently asked "do you know someone who can...?"
- Tracks contacts in a messy spreadsheet + memory

**Pain Points:**
- Forgets context about people met months ago
- Misses when contacts start companies or change roles
- Can't quickly query network by skill/capability
- Contact info fragmented across devices

**Goals:**
- Never forget who someone is or how we met
- Spot investment opportunities when contacts start companies
- Quickly find the right person for any capability need
- Have contacts synced to phone for caller ID

### 3.2 Secondary Persona: The Serial Founder

**Name:** Sarah Park
**Role:** 3x Founder, currently CEO of Series A startup
**Age:** 35

**Needs:**
- Track potential hires, advisors, investors
- Remember context from past interactions
- Know when VCs change funds or focus areas
- Maintain relationships with past colleagues

---

## 4. User Stories & Requirements

### 4.1 Epic: Contact Management

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-101 | As a user, I want to save LinkedIn profiles with one click so I don't have to manually copy data | P0 | Browser extension captures name, headline, employers, profile URL |
| US-102 | As a user, I want to add notes to any contact so I remember context | P0 | Free-text notes field, auto-saved, searchable |
| US-103 | As a user, I want to see a contact's employment history so I understand their background | P0 | List of companies/titles displayed on contact detail |
| US-104 | As a user, I want to search contacts by name, company, or skill | P0 | Full-text search with <500ms response time |
| US-105 | As a user, I want to filter contacts by skill category | P1 | Filter dropdown with hierarchical skill tree |
| US-106 | As a user, I want to archive (not delete) contacts I no longer need | P2 | Soft delete with archive view |

### 4.2 Epic: Skills & Capabilities

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-201 | As a user, I want AI to infer skills from LinkedIn profiles so I don't tag manually | P0 | AI extracts skills with confidence scores on contact save |
| US-202 | As a user, I want to confirm or reject AI-inferred skills | P0 | One-click confirm/reject per skill |
| US-203 | As a user, I want to manually add skills not detected by AI | P1 | Skill picker with autocomplete from taxonomy |
| US-204 | As a user, I want to browse skills hierarchically to find contacts | P1 | Tree view: Category > Subcategory > Skill > Contacts |
| US-205 | As a user, I want to see skill distribution across my network | P2 | Dashboard chart showing top skills |

### 4.3 Epic: Opportunity Detection

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-301 | As a user, I want to be notified when a contact starts a company | P0 | Opportunity created when new Founder/CEO title detected |
| US-302 | As a user, I want to be notified when a contact leaves a corporate job | P1 | Opportunity created when employer removed + title changes |
| US-303 | As a user, I want to dismiss opportunities I'm not interested in | P0 | Dismiss button removes from feed |
| US-304 | As a user, I want to snooze opportunities for later | P2 | Snooze 7d/30d/90d options |
| US-305 | As a user, I want AI to suggest why an opportunity is relevant | P2 | AI-generated summary based on contact skills + my interests |

### 4.4 Epic: Contact Sync

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-401 | As a user, I want to import contacts from Google Contacts | P0 | OAuth flow, imports name/email/phone |
| US-402 | As a user, I want to sync selected contacts back to Google | P0 | Per-contact toggle, syncs within 5 minutes |
| US-403 | As a user, I want synced contacts to appear in my phone's caller ID | P0 | Verified on iOS and Android |
| US-404 | As a user, I want to import contacts from iCloud | P1 (Phase 2) | Apple auth flow, imports name/email/phone |
| US-405 | As a user, I want de-duplication when importing | P1 | Match on email > phone > name, merge records |

### 4.5 Epic: Chrome Extension

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-501 | As a user, I want to see existing notes when viewing a LinkedIn profile | P0 | Extension popup shows saved data if exists |
| US-502 | As a user, I want to save a LinkedIn profile without leaving the page | P0 | Save button in extension popup |
| US-503 | As a user, I want to see AI-inferred skills immediately after saving | P1 | Skills displayed in popup after backend processes |
| US-504 | As a user, I want the extension to work offline | P2 | Queue saves locally, sync when online |

---

## 5. Functional Requirements

### 5.1 Authentication

| Req ID | Requirement |
|--------|-------------|
| FR-101 | System shall support magic link (passwordless) authentication |
| FR-102 | System shall support Google OAuth for authentication |
| FR-103 | Session tokens shall expire after 30 days of inactivity |

### 5.2 Data Management

| Req ID | Requirement |
|--------|-------------|
| FR-201 | System shall store all contact data in PostgreSQL |
| FR-202 | System shall encrypt sensitive fields (tokens) at rest |
| FR-203 | System shall support data export in CSV and JSON formats |
| FR-204 | System shall retain deleted contacts for 30 days before hard delete |

### 5.3 AI Processing

| Req ID | Requirement |
|--------|-------------|
| FR-301 | System shall infer skills using Claude API |
| FR-302 | System shall cache AI results to avoid duplicate API calls |
| FR-303 | System shall process new contacts within 60 seconds |
| FR-304 | System shall provide confidence scores (0-1) for inferred skills |

### 5.4 Sync

| Req ID | Requirement |
|--------|-------------|
| FR-401 | Google Contacts sync shall run every 24 hours minimum |
| FR-402 | Outbound sync (CRM → Google) shall run within 5 minutes of contact update |
| FR-403 | Sync conflicts shall be resolved with CRM as source of truth |
| FR-404 | System shall maintain sync state to enable incremental updates |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Req ID | Requirement |
|--------|-------------|
| NFR-101 | Page load time shall be <2 seconds on 3G connection |
| NFR-102 | Search results shall return in <500ms for up to 10,000 contacts |
| NFR-103 | Extension popup shall load in <1 second |

### 6.2 Scalability

| Req ID | Requirement |
|--------|-------------|
| NFR-201 | System shall support up to 50,000 contacts per user |
| NFR-202 | System shall support up to 1,000 concurrent users |

### 6.3 Reliability

| Req ID | Requirement |
|--------|-------------|
| NFR-301 | System shall maintain 99.5% uptime |
| NFR-302 | Data backups shall run daily with 30-day retention |

### 6.4 Security

| Req ID | Requirement |
|--------|-------------|
| NFR-401 | All data transmission shall use TLS 1.3 |
| NFR-402 | OAuth tokens shall be encrypted with AES-256 |
| NFR-403 | System shall implement rate limiting (100 req/min per user) |

---

## 7. Skills Taxonomy (Reference)

See ADR-003 for full taxonomy. Top-level categories:

1. Security (Governance, Offensive, Defensive, Investigative, Cloud, IAM, etc.)
2. Compliance & Risk
3. Legal (Expert Witness, Practice Areas, Investigations)
4. Consulting & Advisory
5. Enterprise Tech (Mainframe, Middleware, Ecosystems)
6. Engineering
7. Design
8. Product
9. Business
10. Investing

---

## 8. Scope

### 8.1 In Scope (MVP)

- Single-user personal CRM
- Chrome extension for LinkedIn
- Web application (desktop + mobile-responsive)
- Google Contacts bi-directional sync
- AI-powered skill inference
- Opportunity detection for career changes
- PWA for mobile access

### 8.2 Out of Scope (Future)

- Multi-user / team features
- iCloud sync (Phase 2)
- Native mobile apps
- Email/calendar integration
- Advanced relationship graphing
- API access for third parties

---

## 9. Dependencies

| Dependency | Type | Risk | Mitigation |
|------------|------|------|------------|
| LinkedIn DOM structure | External | High | Abstract scraping logic, monitor for changes |
| Google People API | External | Low | Stable API, use official SDK |
| Claude API | External | Low | Fallback to rule-based extraction |
| Supabase | Infrastructure | Low | Portable Postgres, can self-host |

---

## 10. Success Metrics

### 10.1 Adoption Metrics

| Metric | Target (90 days post-launch) |
|--------|------------------------------|
| Registered users | 100 |
| Weekly active users | 50 |
| Contacts per user (avg) | 500+ |
| Extension installs | 200 |

### 10.2 Engagement Metrics

| Metric | Target |
|--------|--------|
| Contacts saved per user per week | 10+ |
| Opportunity actions (view/dismiss) | 5+ per week |
| Skill confirmations per user | 20+ lifetime |
| Google Contacts sync enabled | 60% of users |

### 10.3 Quality Metrics

| Metric | Target |
|--------|--------|
| AI skill inference accuracy | 80%+ (user-confirmed) |
| Opportunity detection precision | 70%+ relevant |
| Sync success rate | 99%+ |

---

## 11. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LinkedIn blocks extension | Medium | High | Use client-side scraping only, respect rate limits, don't automate |
| AI costs exceed budget | Low | Medium | Cache results, batch processing, usage limits |
| User data breach | Low | Critical | Encrypt at rest, minimize stored tokens, SOC 2 practices |
| Low adoption | Medium | High | Focus on power users first, iterate based on feedback |

---

## 12. Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Foundation | Week 1-2 | Supabase schema, auth, basic CRUD |
| Phase 2: Core Features | Week 3-4 | Extension v2, AI inference, opportunity detection |
| Phase 3: Sync | Week 5 | Google Contacts import/export |
| Phase 4: Polish | Week 6 | UI refinement, PWA, testing |
| MVP Launch | Week 7 | Beta release to early users |

---

## 13. Open Questions

1. Should we support Firefox extension in MVP?
2. What's the monetization model? (Freemium, subscription, one-time?)
3. How do we handle LinkedIn rate limiting / detection?
4. Should opportunities have a notification system (email/push)?

---

## 14. Appendices

- ADR-001: Tech Stack Selection
- ADR-002: Data Architecture
- ADR-003: Skills Taxonomy Design
- ADR-004: Sync Strategy
- ADR-005: AI Integration Approach

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| Design Lead | | | |
