# ADR-005: AI Integration Approach

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-12-20 |
| **Deciders** | Product Team |
| **Related PRD** | PRD-001 |
| **Related ADR** | ADR-003 |

---

## Context

The CRM requires AI capabilities for:

1. **Skill Inference** — Extract skills from LinkedIn profile data
2. **Opportunity Classification** — Categorize career transitions
3. **Opportunity Summarization** — Generate human-readable descriptions

We need to balance quality, cost, latency, and privacy.

---

## Decision

### AI Provider: Claude API (Anthropic)

**Model:** Claude 3.5 Sonnet

**Rationale:**
- Excellent at structured data extraction
- Reliable JSON output with proper prompting
- Good cost/quality balance (~$3/1M input tokens, ~$15/1M output tokens)
- Team already familiar with Claude
- Strong safety/alignment properties

### Architecture

```
Contact Upsert (from extension)
    │
    ▼
Supabase Edge Function
    │
    ├─► Save contact to database (immediate)
    │
    └─► Queue AI processing (async)
            │
            ▼
        AI Processing Worker
            │
            ├─► Skill Inference
            │       │
            │       ▼
            │   Update contact_skills table
            │
            └─► Opportunity Detection
                    │
                    ▼
                Create opportunity record
```

### Processing Strategy

| Approach | When |
|----------|------|
| **Synchronous** | Extension popup needs immediate skills display |
| **Asynchronous** | Background enrichment, batch processing |
| **Cached** | Same profile scraped again within 24h |

### Skill Inference

**Input:**
```json
{
  "name": "Sarah Chen",
  "headline": "CEO & Co-founder @ StealthAI | Ex-Google, Ex-Meta",
  "employers": [
    { "company": "StealthAI", "title": "CEO & Co-founder", "is_current": true },
    { "company": "Google", "title": "Product Lead, AI", "is_current": false },
    { "company": "Meta", "title": "Senior PM", "is_current": false }
  ]
}
```

**System Prompt:**
```
You are an expert at analyzing professional profiles and extracting skills.

Given a LinkedIn profile, map the person's skills to the provided taxonomy.

TAXONOMY:
{{skills_taxonomy_json}}

RULES:
1. Return a JSON array of skill matches
2. Each match has: skill_id (UUID), skill_name, confidence (0.0-1.0)
3. Only include skills with confidence >= 0.6
4. Prefer specific skills (level 2) over categories (level 0)
5. Consider:
   - Job titles (explicit skills)
   - Company types (e.g., "Big 4" implies consulting skills)
   - Career progression (e.g., multiple AI roles = strong AI skills)
   - Industry signals (e.g., "fintech startup" = Fintech domain)

CONFIDENCE GUIDELINES:
- 0.9-1.0: Explicit in title/headline
- 0.7-0.9: Strongly implied by role/company
- 0.6-0.7: Reasonably inferred

OUTPUT FORMAT:
{
  "skills": [
    { "skill_id": "uuid", "skill_name": "AI/ML", "confidence": 0.92 },
    { "skill_id": "uuid", "skill_name": "Product Management", "confidence": 0.88 }
  ]
}

Return only valid JSON, no explanation.
```

**Output:**
```json
{
  "skills": [
    { "skill_id": "...", "skill_name": "AI/ML", "confidence": 0.92 },
    { "skill_id": "...", "skill_name": "Product Management", "confidence": 0.88 },
    { "skill_id": "...", "skill_name": "Startup Founder", "confidence": 0.95 },
    { "skill_id": "...", "skill_name": "Technology/SaaS", "confidence": 0.78 }
  ]
}
```

### Opportunity Detection

**Trigger:** Employer list changed from previous scrape

**Input:**
```json
{
  "contact_name": "John Smith",
  "previous_employers": [
    { "company": "IBM", "title": "Global Security Architect" }
  ],
  "current_employers": [
    { "company": "Smith Security Consulting", "title": "Principal Consultant" }
  ]
}
```

**System Prompt:**
```
You are analyzing a professional's career transition.

Given the previous and current employment, classify this transition.

TRANSITION TYPES:
- left_company: Left a company (notable for potential availability)
- started_company: Founded or co-founded a new company
- became_investor: Became an angel investor, VC, or LP
- went_independent: Became a consultant, advisor, or fractional exec
- joined_startup: Left established company for startup
- promoted: Significant promotion (to C-level, VP, Director)
- changed_industries: Moved to a different industry

OUTPUT FORMAT:
{
  "transitions": [
    {
      "type": "went_independent",
      "title": "John Smith went independent",
      "description": "Left IBM after serving as Global Security Architect. Now Principal Consultant at Smith Security Consulting. May be available for advisory, consulting, or partnership opportunities.",
      "confidence": 0.88
    }
  ]
}

Return only valid JSON. Include 1-3 most relevant transitions.
```

### Caching Strategy

```
Cache Key: hash(profile_id + employers_hash + taxonomy_version)
Cache TTL: 24 hours

On cache hit:
  - Return cached skills immediately
  - Skip AI call

On cache miss:
  - Call AI
  - Store in cache
  - Update database
```

**Cache Storage:** Supabase table or Redis (if needed for performance)

```sql
CREATE TABLE ai_cache (
    cache_key TEXT PRIMARY KEY,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Cleanup job
DELETE FROM ai_cache WHERE expires_at < NOW();
```

### Cost Management

**Estimated Usage (per contact):**
- Input: ~500 tokens (profile + taxonomy excerpt)
- Output: ~200 tokens (skills JSON)
- Cost: ~$0.005 per contact

**Monthly Estimates:**

| Contacts/Month | Cost |
|----------------|------|
| 100 | $0.50 |
| 1,000 | $5.00 |
| 10,000 | $50.00 |

**Cost Controls:**
1. Cache results (avoid duplicate processing)
2. Rate limit per user (100 AI calls/day)
3. Batch processing during off-peak
4. Skip processing for unchanged profiles

### Error Handling

| Error | Handling |
|-------|----------|
| API timeout | Retry 2x with exponential backoff |
| Rate limit (429) | Queue for later, exponential backoff |
| Invalid JSON response | Log, retry once, fallback to empty skills |
| API key invalid | Alert admin, disable AI features gracefully |
| Model unavailable | Fallback to rule-based extraction |

### Fallback: Rule-Based Extraction

When AI is unavailable or for cost savings:

```typescript
function extractSkillsRuleBased(profile: Profile): Skill[] {
  const skills: Skill[] = [];

  // Title-based rules
  if (profile.headline.match(/CISO|Security/i)) {
    skills.push({ id: SECURITY_GOVERNANCE_ID, confidence: 0.7 });
  }

  // Company-based rules
  if (profile.employers.some(e => BIG_4.includes(e.company))) {
    skills.push({ id: BIG_4_ID, confidence: 0.8 });
  }

  return skills;
}
```

---

## Alternatives Considered

### OpenAI GPT-4

**Pros:** Widely used, function calling
**Cons:** Higher cost, rate limits, less reliable JSON
**Decision:** Rejected — Claude better for structured extraction

### Local LLM (Ollama/llama.cpp)

**Pros:** Free, private, no API dependency
**Cons:** Lower quality, slower, requires infrastructure
**Decision:** Rejected for MVP — quality matters more than cost at this scale

### Embeddings-Only Approach

**Pros:** Fast, cheap, deterministic
**Cons:** Limited to similarity matching, can't handle nuanced inference
**Decision:** Rejected — LLM reasoning needed for accurate skill mapping

### No AI (Manual Only)

**Pros:** Zero cost, full accuracy
**Cons:** Defeats the purpose, too much manual effort
**Decision:** Rejected — AI is core value prop

---

## Consequences

### Positive

- High-quality skill inference with confidence scores
- Actionable opportunity descriptions
- Scalable with caching
- Graceful fallback when AI unavailable

### Negative

- External API dependency
- Cost scales with usage
- Latency for synchronous calls (~1-2s)
- Need to maintain prompts as taxonomy evolves

### Privacy Considerations

- Only semi-public LinkedIn data sent to AI
- No PII beyond name/title/company
- Anthropic's data retention policies apply
- User can opt-out of AI features (future)

---

## Monitoring & Observability

### Metrics to Track

| Metric | Purpose |
|--------|---------|
| AI call latency (p50, p95) | Performance monitoring |
| AI call success rate | Reliability monitoring |
| Cache hit rate | Cost optimization |
| Skill confirmation rate | Quality measurement |
| Tokens used per call | Cost tracking |
| Monthly AI spend | Budget monitoring |

### Alerts

- AI error rate > 5% in 5 minutes
- Monthly spend > 80% of budget
- Latency p95 > 5 seconds

---

## Future Enhancements

### Phase 2
- Batch processing queue (process overnight)
- User feedback loop (improve prompts from confirmations)
- A/B test different prompts

### Phase 3
- Fine-tuned model on user confirmations
- Relationship strength scoring
- Intro path suggestions

---

## References

- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Structured Output with Claude](https://docs.anthropic.com/claude/docs/tool-use)
