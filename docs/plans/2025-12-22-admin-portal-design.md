# Admin Portal Design

## Overview

Hybrid admin approach: Supabase Studio for raw data exploration, custom Next.js pages for timeline visualization and bulk operations.

## Authentication

- Same Google OAuth as regular users
- Admin check: `user.email === process.env.ADMIN_EMAIL`
- Non-admins redirected from `/admin/*` routes

## Routes

```
/admin                    → Dashboard with change timeline
/admin/reset              → Bulk delete/reset tools
Supabase Studio           → Raw data exploration (existing)
```

## Timeline Dashboard (`/admin`)

Chronological feed of all profile changes:

- Grouped by date (Today, Yesterday, etc.)
- Each entry shows: change type icon, contact name, old → new value, timestamp, profile link
- Filters: date range, change type, contact search
- Refresh button for live monitoring
- Pagination for large datasets

Data: `contact_history` joined with `contacts`

## Reset Tools (`/admin/reset`)

Stats display:
- Total contacts count
- Total history entries count
- Total users count

Actions (with "DELETE" confirmation):
- Clear History: delete all `contact_history`
- Clear Contacts: delete all `contacts` (cascades to history)
- Reset Everything: delete all user data

Export:
- Download all data as JSON before destructive operations

## Files

```
src/app/admin/layout.tsx      → Admin auth guard
src/app/admin/page.tsx        → Timeline dashboard
src/app/admin/reset/page.tsx  → Bulk operations
src/lib/admin.ts              → Admin check helper

src/app/api/admin/timeline/route.ts  → Paginated history
src/app/api/admin/stats/route.ts     → Counts
src/app/api/admin/reset/route.ts     → Bulk deletes
src/app/api/admin/export/route.ts    → JSON export
```

## Environment

```
ADMIN_EMAIL=your@email.com
```

## Scope

- ~8 files
- No new dependencies
- Reuses existing Supabase client and auth
