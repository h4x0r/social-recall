# Chrome Web Store Permissions Justification

This document explains why Social Recall requires each permission requested in the manifest.

## Permissions

### `storage`
**Purpose:** Store user data locally in the browser.

**Why it's needed:**
- Save LinkedIn profile data that users have viewed
- Store personal notes users add to contacts
- Remember user preferences (panel position, settings)
- Cache AI analysis results to avoid redundant API calls

**What we store:**
- Profile information (name, headline, employers, education)
- User-written notes
- Extension settings
- Profile change history

**User benefit:** Data persists between browser sessions and can sync across devices.

---

### `activeTab`
**Purpose:** Access the currently active tab when the user interacts with the extension.

**Why it's needed:**
- Read LinkedIn profile page content to extract profile data
- Inject the floating panel UI into the page
- Determine if the current page is a LinkedIn profile

**Scope:** Only activates on tabs where the user has navigated to linkedin.com.

**User benefit:** The extension can display profile intelligence on the page you're viewing.

---

### `scripting`
**Purpose:** Inject scripts and styles into web pages.

**Why it's needed:**
- Inject the content script that extracts profile data
- Inject the CSS for the floating panel
- Intercept LinkedIn's internal API responses for complete data

**Scope:** Only used on linkedin.com pages as specified in content_scripts.

**User benefit:** Enables the profile panel to appear seamlessly on LinkedIn.

---

### `tabs`
**Purpose:** Query and observe browser tabs.

**Why it's needed:**
- Detect when the user navigates to a new LinkedIn profile
- Update the extension icon based on page context
- Handle LinkedIn's single-page app navigation

**Scope:** Used to detect URL changes on linkedin.com tabs only.

**User benefit:** Extension responds instantly when you navigate to a new profile.

---

### `contextMenus`
**Purpose:** Add items to the browser's right-click context menu.

**Why it's needed:**
- Provide quick actions like "Save this profile"
- Future feature: "Add note about selected text"

**User benefit:** Fast access to extension features without opening the popup.

---

### `webNavigation`
**Purpose:** Observe navigation events in the browser.

**Why it's needed:**
- LinkedIn uses client-side routing (SPA)
- Standard page load events don't fire on internal navigation
- Need to detect when user navigates between profiles

**Scope:** Only monitors navigation on linkedin.com.

**User benefit:** Extension correctly updates when you browse between LinkedIn profiles.

---

## Host Permissions

### `*://*.linkedin.com/*`
**Purpose:** Access LinkedIn website pages.

**Why it's needed:**
- Read profile data from LinkedIn pages
- Inject the floating panel UI
- Intercept API responses for complete profile data

**What we access:**
- Publicly visible profile information
- LinkedIn's internal Voyager API responses (for structured data)

**What we don't access:**
- Your LinkedIn login credentials
- Private messages
- Your connection list
- Any authenticated-only data

**User benefit:** Core functionality - saving and displaying profile intelligence.

---

### `https://social-recall.vercel.app/*` and `https://*.vercel.app/*`
**Purpose:** Connect to our cloud backend.

**Why it's needed:**
- Sync saved profiles across devices (optional)
- Send profile data for AI analysis
- Authenticate users via Google OAuth
- Store and retrieve notes from cloud

**What we send:**
- Profile data for AI analysis
- Notes for cloud backup
- Authentication tokens

**Security:**
- All connections use HTTPS
- Data is encrypted in transit
- Authentication required for cloud features

**User benefit:** Enables cloud sync and AI-powered insights.

---

## Summary Table

| Permission | Sensitivity | Justification |
|------------|-------------|---------------|
| storage | Low | Local data persistence |
| activeTab | Medium | Read current LinkedIn page |
| scripting | Medium | Inject panel UI |
| tabs | Low | Detect profile navigation |
| contextMenus | Low | Right-click actions |
| webNavigation | Low | SPA navigation detection |
| linkedin.com | High | Core functionality |
| vercel.app | Medium | Cloud sync and AI |

## Privacy Considerations

1. **Minimal data collection:** We only collect publicly visible LinkedIn data.
2. **Local-first:** All data is stored locally by default.
3. **Optional cloud:** Users choose whether to sync to cloud.
4. **No credential access:** We never access LinkedIn login credentials.
5. **Transparent processing:** Users can see all stored data and delete it.

## Chrome Web Store Review Notes

For reviewers:
- The extension injects content scripts only on linkedin.com
- API interception captures Voyager API responses for complete profile data
- No background network requests unless user has enabled cloud sync
- All permissions are necessary for core functionality
- The extension complies with LinkedIn's terms of service
