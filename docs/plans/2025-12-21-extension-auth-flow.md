# Extension Auth Token Flow Design

**Date:** 2025-12-21
**Status:** Ready for implementation

## Overview

Enable the Chrome extension to receive an auth token from the web app after user login, allowing sync functionality to work.

## Architecture

```
1. Extension popup → "Connect Account" button
2. Opens: https://your-app.com/auth/extension
3. User logs in (Google OAuth via Supabase)
4. Web app detects success + sends token
5. Web app calls: chrome.runtime.sendMessage(EXTENSION_ID, { type: 'AUTH_TOKEN', token })
6. Extension background.ts receives via onMessageExternal
7. Stores token in chrome.storage.sync
8. Sends ack, user sees "Connected!"
```

## Components

### Extension: background.ts

Listens for external messages from the web app:

```typescript
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    // Validate sender is our web app
    if (!sender.url?.startsWith(WEB_APP_ORIGIN)) {
      sendResponse({ success: false, error: 'Invalid origin' });
      return;
    }

    if (message.type === 'AUTH_TOKEN' && message.token) {
      chrome.storage.sync.set({ syncToken: message.token }, () => {
        sendResponse({ success: true });
        chrome.runtime.sendMessage({ type: 'AUTH_SUCCESS' });
      });
      return true; // Keep channel open for async
    }
  }
);
```

### Extension: manifest.json

Add externally_connectable to allow web app messaging:

```json
{
  "externally_connectable": {
    "matches": ["https://social-recall.vercel.app/*", "http://localhost:3000/*"]
  }
}
```

### Web App: /auth/extension/page.tsx

After login, sends token to extension:

```typescript
chrome.runtime.sendMessage(
  EXTENSION_ID,
  { type: 'AUTH_TOKEN', token: session.access_token },
  (response) => {
    if (response?.success) setStatus('success');
    else setStatus('error');
  }
);
```

### Extension: popup.ts

Shows connection status with connect/disconnect buttons:
- Connected: Shows "Sync Now" and "Disconnect" buttons
- Disconnected: Shows "Connect Account" button
- Listens for AUTH_SUCCESS to update UI

## Error Handling

| Scenario | Handling |
|----------|----------|
| Extension not installed | Web app shows install prompt |
| Token expired | 401 from API, clear token, prompt reconnect |
| Network error | Show retry, preserve local data |
| User cancels login | No token sent, stay disconnected |

## Security

- Web app only sends token to known extension ID
- Extension validates message sender origin
- Token stored in chrome.storage.sync (encrypted)
- Manifest restricts which origins can message

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/extension/src/background.ts` | Create |
| `apps/extension/src/background.test.ts` | Create |
| `apps/extension/src/popup.ts` | Modify |
| `apps/extension/src/popup.test.ts` | Create |
| `apps/extension/manifest.json` | Modify |
| `apps/web/src/app/auth/extension/page.tsx` | Create |
| `apps/web/src/app/auth/extension/page.test.tsx` | Create |

## Test Strategy

TDD approach - write tests first for:
1. Background script message handling
2. Popup auth status rendering
3. Web app token sending page
