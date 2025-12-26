# Privacy Policy for Social Recall

**Last Updated: December 26, 2025**

## Overview

Social Recall ("the Extension") is a Chrome browser extension that helps professionals manage their LinkedIn network by saving profile information locally and providing AI-powered insights. This privacy policy explains what data we collect, how we use it, and your rights regarding your data.

## Data We Collect

### LinkedIn Profile Data

When you visit a LinkedIn profile page, the Extension extracts the following publicly visible information:

- Name and headline
- Profile photo URL
- Location
- About/summary text
- Work experience (company names, job titles)
- Education history
- Skills listed on the profile
- Certifications and licenses
- Volunteer experience
- Recent activity posts

**Important:** We only collect information that is publicly visible on the LinkedIn profile page you are viewing. We do not access private messages, connection lists, or any data that requires LinkedIn login credentials.

### Data You Provide

- **Notes:** Personal notes you write about contacts
- **Settings:** Your preferences for the Extension (e.g., panel position)

### Authentication Data

If you sign in with Google:
- Email address (for account identification)
- Google account ID (for authentication only)

We do not access your Google contacts, calendar, or any other Google services.

## How We Use Your Data

### Local Storage

Most data is stored locally in your browser using Chrome's storage API:
- Profile information you've viewed
- Your personal notes
- Extension settings

This data never leaves your device unless you explicitly sync it.

### Cloud Sync (Optional)

If you create an account, the following data is synced to our servers:
- Saved profile information
- Your notes
- Profile change history

This enables you to:
- Access your contacts across devices
- Detect when contacts change jobs
- Search your network

### AI Analysis

Profile data may be sent to our servers for AI-powered analysis to:
- Infer professional archetypes
- Extract key skills
- Identify potential collaboration opportunities

This analysis is performed securely and the raw profile data is not retained after processing.

## Data Storage and Security

### Local Data
- Stored using Chrome's `storage.sync` and `storage.local` APIs
- Protected by Chrome's built-in security
- Accessible only to this Extension

### Cloud Data
- Stored on Supabase (PostgreSQL database)
- Encrypted in transit (HTTPS/TLS)
- Hosted in secure data centers
- Access controlled by authentication

## Third-Party Services

### LinkedIn
- We read publicly visible profile data from LinkedIn pages
- We do not have access to your LinkedIn account
- We comply with LinkedIn's terms of service

### Google Authentication
- Used only for sign-in
- We receive only basic profile info (email, name)
- We do not access other Google services

### Vercel
- Hosts our web application and API
- Processes AI analysis requests
- Does not store personal data long-term

### Supabase
- Provides database and authentication services
- Stores synced profile data for authenticated users
- Located in the United States

## Your Rights

### Access Your Data
- View all locally stored data via Chrome's developer tools
- Export your data from the Extension settings

### Delete Your Data
- Clear local data: Uninstall the Extension or clear Chrome storage
- Delete cloud data: Use the "Delete Account" option in settings or contact us

### Data Portability
- Export your contacts and notes in JSON format from settings

## Data Retention

- **Local data:** Retained until you clear it or uninstall the Extension
- **Cloud data:** Retained until you delete your account
- **AI processing:** Profile data is not retained after analysis is complete

## Children's Privacy

This Extension is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children.

## Changes to This Policy

We may update this privacy policy periodically. Significant changes will be communicated through the Extension or our website.

## Contact Us

For questions about this privacy policy or your data:

- **Email:** privacy@social-recall.app
- **GitHub:** https://github.com/h4x0r/social-recall/issues

## Permissions Explained

The Extension requires certain browser permissions to function:

| Permission | Purpose |
|------------|---------|
| `storage` | Save your contacts and settings locally |
| `activeTab` | Read the current LinkedIn page you're viewing |
| `scripting` | Inject the profile panel into LinkedIn pages |
| `tabs` | Detect when you navigate to profile pages |
| `contextMenus` | Right-click menu for quick actions |
| `webNavigation` | Detect LinkedIn navigation in single-page app |
| `host_permissions` (linkedin.com) | Access LinkedIn profile pages |
| `host_permissions` (vercel.app) | Connect to our cloud API for sync and AI |

## Legal Basis for Processing (GDPR)

For users in the European Economic Area, we process your data based on:

- **Consent:** You choose to install and use the Extension
- **Legitimate Interest:** Providing the service you requested
- **Contract:** If you create an account, fulfilling our service agreement

You may withdraw consent at any time by uninstalling the Extension.
