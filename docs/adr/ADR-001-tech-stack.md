# ADR-001: Tech Stack Selection

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-12-20 |
| **Deciders** | Product Team |
| **Related PRD** | PRD-001 |

---

## Context

We need to select a technology stack for building a personal CRM with the following requirements:

- Web application with responsive design
- Chrome browser extension
- Backend API with database
- Real-time updates
- AI integration for skill inference
- OAuth integration (Google, potentially Apple)
- Fast time-to-market (MVP in 6-7 weeks)

The team has experience with TypeScript, React, and Node.js ecosystems.

---

## Decision

### Frontend: Next.js 14 (App Router)

**Choice:** Next.js with App Router, React Server Components

**Rationale:**
- Server-side rendering for fast initial load
- API routes eliminate need for separate backend
- App Router provides modern patterns (layouts, loading states)
- Excellent Vercel deployment integration
- Large ecosystem and community support

### Styling: Tailwind CSS + shadcn/ui

**Choice:** Tailwind for utility-first CSS, shadcn/ui for components

**Rationale:**
- Rapid development with utility classes
- shadcn/ui provides accessible, customizable components
- No runtime CSS-in-JS overhead
- Consistent design language out of the box

### Backend: Supabase

**Choice:** Supabase (PostgreSQL, Auth, Edge Functions, Realtime)

**Rationale:**
- PostgreSQL provides robust relational data model
- Built-in authentication with OAuth providers
- Edge Functions for serverless compute
- Realtime subscriptions for live updates
- Generous free tier for MVP
- Portable: can self-host or migrate to raw Postgres

### AI: Claude API (Anthropic)

**Choice:** Claude 3.5 Sonnet for skill inference

**Rationale:**
- Excellent at structured data extraction
- Reliable JSON output with system prompts
- Cost-effective for batch processing
- Team already familiar with Claude

### Extension: TypeScript

**Choice:** Evolve existing Social Recall extension (TypeScript)

**Rationale:**
- Extension already exists and is published
- TypeScript provides type safety
- Manifest V3 compliant
- Minimal rewrite needed

### Hosting: Vercel + Supabase

**Choice:** Vercel for frontend, Supabase for backend

**Rationale:**
- Free tiers sufficient for MVP
- Automatic deployments from Git
- Edge network for fast global performance
- Simple scaling path

---

## Alternatives Considered

### Frontend Alternatives

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Next.js** | SSR, API routes, ecosystem | Complexity | ✅ Selected |
| Create React App | Simple, familiar | No SSR, deprecated | ❌ Rejected |
| Remix | Modern, nested routes | Smaller ecosystem | ❌ Rejected |
| Vue/Nuxt | Good DX | Team less familiar | ❌ Rejected |

### Backend Alternatives

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Supabase** | All-in-one, Postgres | Some vendor lock-in | ✅ Selected |
| Firebase | Real-time, Google integration | NoSQL, less portable | ❌ Rejected |
| PlanetScale | Serverless MySQL | No built-in auth | ❌ Rejected |
| Self-hosted Postgres | Full control | Ops overhead | ❌ Rejected |
| Railway | Simple deployment | Less features than Supabase | ❌ Rejected |

### AI Alternatives

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Claude API** | Quality, reliability | Cost | ✅ Selected |
| OpenAI GPT-4 | Ecosystem, tools | Higher cost, rate limits | ❌ Rejected |
| Local LLM (Ollama) | Free, private | Quality, speed | ❌ Rejected |
| Rule-based | Deterministic, free | Limited flexibility | ❌ Rejected (fallback only) |

---

## Consequences

### Positive

- Fast development with familiar tools
- Low operational overhead
- Cost-effective for MVP scale
- Easy to iterate and deploy
- Portable data layer (Postgres)

### Negative

- Supabase Edge Functions have cold start latency
- Next.js App Router still maturing (some bugs)
- Dependent on Vercel for optimal Next.js performance
- AI costs scale with usage

### Risks

- Supabase free tier limits (500MB database, 50MB file storage)
- Vercel free tier limits (100GB bandwidth)
- Need to monitor Claude API costs

### Mitigation

- Implement caching for AI results
- Use pagination to limit data transfer
- Monitor usage dashboards weekly
- Have migration plan to self-hosted if needed

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Claude API Documentation](https://docs.anthropic.com)
