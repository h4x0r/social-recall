# Consent System Redesign

## Overview

Redesign the consent system to remove IP address storage and use OAuth-based authentication for both consent and revocation.

## Problem

Current implementation:
- Stores IP addresses in `consent_logs` (privacy concern)
- Uses IP validation for revocation (weak security - IPs change)
- Consent happens before OAuth, so no user_id available

## Solution

Defer consent to after OAuth login. Use `user_id` as the identifier instead of IP address.

## Architecture

### Surfaces

| Surface | Purpose |
|---------|---------|
| Panel | AI analysis of current LinkedIn profile |
| Popup/Modal | History, settings, consent dialog |
| Web app | Contact management, privacy page, OAuth callback |

### Consent Flow

```
Extension panel: User clicks "Connect Google"
    ↓
Extension: chrome.tabs.create() → opens OAuth tab
    ↓
OAuth flow: Supabase → Google → /auth/callback
    ↓
Web app: Creates user in auth.users, closes tab
    ↓
Extension: Detects login (polls session or listens for tab close)
    ↓
Extension: Queries consent_logs for user_id → no record
    ↓
Extension: Shows consent dialog (art deco modal in panel)
    ↓
Accept → Server action logs consent with user_id → Sync enabled
Decline → Server action deletes auth.users record → Back to logged-out state
```

### Revocation Flow

```
Extension settings: User clicks "Privacy & Data"
    ↓
Opens /privacy page in browser
    ↓
User is logged in (OAuth session)
    ↓
Privacy page shows "Revoke Consent" button
    ↓
Click → Server action: UPDATE consent_logs SET revoked_at = now() WHERE user_id = ?
    ↓
Done. Extension stops syncing.
```

## Database Changes

### Migration: `014_remove_ip_from_consent.sql`

```sql
-- Remove IP address column (no longer needed)
ALTER TABLE consent_logs DROP COLUMN IF EXISTS ip_address;

-- Remove IP index
DROP INDEX IF EXISTS idx_consent_logs_ip;

-- Make user_id required (was optional)
-- Note: Only run if no NULL user_id records exist
ALTER TABLE consent_logs ALTER COLUMN user_id SET NOT NULL;
```

### Updated Schema

```sql
CREATE TABLE consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    extension_version TEXT NOT NULL,
    consent_text_version TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    given BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_logs_user_id ON consent_logs(user_id);
```

## Files to Delete

- `/apps/web/src/app/api/consent-log/route.ts` - replaced by server action
- `/apps/web/src/app/api/privacy/revoke-consent/route.ts` - replaced by server action

## Files to Modify

### Extension

**`/apps/extension/src/consent.ts`**
- Remove IP-related code
- Remove direct API calls to `/api/consent-log`
- Add: function to check consent status via session
- Add: function to call server actions for accept/decline

**`/apps/extension/src/panel.tsx` (or equivalent)**
- Add: consent dialog modal (art deco style)
- Add: logic to show consent after OAuth detected + no consent record
- Add: handlers for accept/decline

### Web App

**`/apps/web/src/app/auth/callback/page.tsx`**
- Remove consent dialog (moves to extension)
- Just handle OAuth callback + close tab or show "you can close this"

**`/apps/web/src/app/privacy/page.tsx`**
- Add: "Revoke Consent" button for logged-in users
- Add: server action to revoke consent
- Add: server action to delete user (for decline flow)

**`/apps/web/src/lib/actions/consent.ts`** (new)
- `logConsent(userId)` - insert into consent_logs
- `revokeConsent(userId)` - set revoked_at
- `deleteUserAndConsent(userId)` - delete from auth.users (cascades)

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Panel closes after OAuth, before consent | Next panel open: detect login + no consent → show dialog |
| Network error during consent logging | Show retry button |
| User ignores consent dialog | Can't sync until they decide |
| User revokes then wants to re-consent | Must go through OAuth flow again |

## UI Design

Consent dialog in extension panel:
- Dark charcoal background (#1a1a1a)
- Gold accents (#D4AF37)
- Playfair Display headers, DM Sans body
- Modal overlay on top of panel content
- "I Understand & Accept" button
- "Decline" link/button
- Link to privacy policy

## Testing

- [ ] OAuth flow completes, consent dialog shows
- [ ] Accept consent → consent_logs record created with user_id
- [ ] Decline consent → auth.users record deleted, back to logged-out
- [ ] Revoke from /privacy → revoked_at set, extension stops syncing
- [ ] Panel close/reopen mid-flow → consent dialog shows again
- [ ] No IP addresses stored anywhere
