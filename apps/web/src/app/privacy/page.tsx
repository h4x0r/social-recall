import type { Metadata } from "next";
import { Suspense } from "react";
import { DeletionForm } from "@/components/privacy/deletion-form";
import { StatusBanner } from "@/components/privacy/status-banner";
import { RevokeConsentButton } from "@/components/privacy/revoke-consent-button";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Social Recall Chrome Extension and Web Application",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Suspense fallback={null}>
          <StatusBanner />
        </Suspense>
        <h1 className="font-display text-4xl mb-2">Privacy Policy</h1>
        <p className="text-neutral-400 mb-12">Last Updated: December 26, 2025</p>

        <div className="prose prose-invert prose-neutral max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-display mb-4">Overview</h2>
            <p className="text-neutral-300 leading-relaxed">
              Social Recall (&quot;the Extension&quot;) is a Chrome browser extension that helps
              professionals manage their LinkedIn network by saving profile information locally
              and providing AI-powered insights. This privacy policy explains what data we collect,
              how we use it, and your rights regarding your data.
            </p>
          </section>

          <section className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-6 my-8">
            <h2 className="text-2xl font-display mb-4 text-amber-400">⚠️ Important: Authenticated Proxy Notice</h2>
            <p className="text-amber-200 leading-relaxed mb-4">
              <strong>This extension acts as an AUTHENTICATED PROXY.</strong>
            </p>
            <p className="text-neutral-300 leading-relaxed mb-4">
              When you use Social Recall, it captures LinkedIn profile data that is visible through
              YOUR logged-in LinkedIn session. This includes connection-restricted information that
              you can access because of your LinkedIn credentials and network connections.
            </p>
            <p className="text-neutral-300 leading-relaxed mb-4">
              This data is transmitted to our servers for processing and storage. By using this
              extension, you acknowledge that you are acting as a data collection proxy - allowing
              us to collect LinkedIn data that we could not access otherwise.
            </p>
            <p className="text-neutral-400 text-sm">
              Your consent to this data collection is logged with your account and timestamp
              for compliance purposes. You can revoke consent at any time below or in the extension settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Data We Collect</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">LinkedIn Profile Data</h3>
            <p className="text-neutral-300 leading-relaxed mb-4">
              When you visit a LinkedIn profile page, the Extension extracts information
              visible to you through your authenticated LinkedIn session:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 ml-4">
              <li>Name and headline</li>
              <li>Profile photo URL</li>
              <li>Location</li>
              <li>About/summary text</li>
              <li>Work experience (company names, job titles)</li>
              <li>Education history</li>
              <li>Skills listed on the profile</li>
              <li>Certifications and licenses</li>
              <li>Volunteer experience</li>
              <li>Recent activity posts</li>
            </ul>
            <p className="text-neutral-400 mt-4 text-sm">
              <strong>Note:</strong> This includes profile information that may only be visible because
              of your LinkedIn credentials and network connections. We do not access private messages
              or your LinkedIn connection list.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Consent Record</h3>
            <p className="text-neutral-300 leading-relaxed mb-4">
              When you grant consent to data collection, we record:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 ml-4">
              <li>Timestamp of consent</li>
              <li>Your account ID (linked to your OAuth sign-in)</li>
              <li>Extension version and consent text version (hash)</li>
              <li>Browser user agent</li>
            </ul>
            <p className="text-neutral-400 mt-4 text-sm">
              This record is retained to demonstrate that valid consent was obtained, as required
              by GDPR Article 7. If you request data deletion, your consent record will be removed
              along with your account.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Data You Provide</h3>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 ml-4">
              <li><strong>Notes:</strong> Personal notes you write about contacts</li>
              <li><strong>Settings:</strong> Your preferences for the Extension</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Authentication Data</h3>
            <p className="text-neutral-300 leading-relaxed">
              If you sign in with Google, we collect your email address (for account identification)
              and Google account ID (for authentication only). We do not access your Google contacts,
              calendar, or any other Google services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">How We Use Your Data</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">Local Storage</h3>
            <p className="text-neutral-300 leading-relaxed">
              Most data is stored locally in your browser using Chrome&apos;s storage API. This includes
              profile information you&apos;ve viewed, your personal notes, and extension settings.
              This data never leaves your device unless you explicitly sync it.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Cloud Sync (Optional)</h3>
            <p className="text-neutral-300 leading-relaxed">
              If you create an account, saved profile information, notes, and profile change history
              are synced to our servers. This enables cross-device access, job change detection,
              and network search.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">AI Analysis</h3>
            <p className="text-neutral-300 leading-relaxed">
              Profile data may be sent to our servers for AI-powered analysis to infer professional
              archetypes, extract key skills, and identify collaboration opportunities. This analysis
              is performed securely and raw profile data is not retained after processing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Data Storage and Security</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              <strong>Local Data:</strong> Stored using Chrome&apos;s storage APIs, protected by
              Chrome&apos;s built-in security, accessible only to this Extension.
            </p>
            <p className="text-neutral-300 leading-relaxed">
              <strong>Cloud Data:</strong> Stored on Supabase (PostgreSQL), encrypted in transit
              (HTTPS/TLS), hosted in secure data centers with access controlled by authentication.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Third-Party Services</h2>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-4">
              <li><strong>LinkedIn:</strong> We read profile data visible to you via your authenticated session. We do not access your LinkedIn credentials.</li>
              <li><strong>Google Authentication:</strong> Used only for sign-in. We receive only basic profile info.</li>
              <li><strong>Vercel:</strong> Hosts our web application and processes AI analysis requests.</li>
              <li><strong>Supabase:</strong> Provides database and authentication services (US-based).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Your Rights</h2>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-4">
              <li><strong>Access:</strong> View all locally stored data via Chrome developer tools.</li>
              <li><strong>Revoke Consent:</strong> Stop data collection at any time via extension settings. This stops future uploads but preserves your existing data.</li>
              <li><strong>Delete:</strong> Request deletion of your personal data using the form below. This removes your notes, browsing history, and anonymizes your consent record.</li>
              <li><strong>Export:</strong> Download your contacts and notes via extension settings.</li>
            </ul>
            <p className="text-neutral-400 mt-4 text-sm">
              <strong>Note on Profile Data:</strong> LinkedIn profile data you&apos;ve helped collect is aggregated
              into our master database and may be retained even after you delete your personal data.
              This aggregated data is not tied to your identity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Data Retention</h2>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-4">
              <li><strong>Local data:</strong> Retained until you clear it or uninstall the Extension</li>
              <li><strong>Cloud data:</strong> Retained until you delete your account</li>
              <li><strong>AI processing:</strong> Profile data is not retained after analysis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Children&apos;s Privacy</h2>
            <p className="text-neutral-300 leading-relaxed">
              This Extension is not intended for use by children under 13 years of age.
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Changes to This Policy</h2>
            <p className="text-neutral-300 leading-relaxed">
              We may update this privacy policy periodically. Significant changes will be
              communicated through the Extension or our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Contact Us</h2>
            <p className="text-neutral-300 leading-relaxed">
              For questions about this privacy policy or your data:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 ml-4 mt-2">
              <li>Email: <a href="mailto:privacy@socialrecall.now" className="text-blue-400 hover:underline">privacy@socialrecall.now</a></li>
              <li>GitHub: <a href="https://github.com/h4x0r/social-recall/issues" className="text-blue-400 hover:underline">github.com/h4x0r/social-recall/issues</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Legal Basis for Processing (GDPR)</h2>
            <p className="text-neutral-300 leading-relaxed">
              For users in the European Economic Area, we process your data based on:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 ml-4 mt-2">
              <li><strong>Consent:</strong> You explicitly consent to data collection via the in-extension consent dialog</li>
              <li><strong>Legitimate Interest:</strong> Providing the service you requested</li>
              <li><strong>Contract:</strong> If you create an account, fulfilling our service agreement</li>
            </ul>
            <p className="text-neutral-400 mt-4 text-sm">
              You may withdraw consent at any time via extension settings or by uninstalling the Extension.
            </p>
          </section>

          <section className="mt-12 pt-8 border-t border-neutral-800" id="revoke-consent">
            <h2 className="text-2xl font-display mb-4 text-amber-400">Revoke Consent</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              If you no longer want the extension to collect data on your behalf, you can revoke
              your consent. This will:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 ml-4 mb-6">
              <li>Stop all future data collection</li>
              <li>Keep your existing data (contacts, notes) intact</li>
              <li>Allow you to continue using the web app</li>
            </ul>
            <p className="text-neutral-400 text-sm mb-4">
              You can re-grant consent later by signing in again through the extension.
            </p>
            <RevokeConsentButton />
          </section>

          <section className="mt-12 pt-8 border-t border-neutral-800" id="delete-my-data">
            <h2 className="text-2xl font-display mb-4 text-red-400">Delete My Data</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              To request complete deletion of your personal data, enter the email address associated
              with your Social Recall account. This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 ml-4 mb-6">
              <li>Your notes and browsing history</li>
              <li>Your account and settings</li>
              <li>Your consent record</li>
            </ul>
            <p className="text-neutral-400 text-sm mb-4">
              Note: LinkedIn profile data you helped collect is aggregated and will remain in
              our master database, but will no longer be associated with your account.
            </p>
            <DeletionForm />
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-neutral-800">
          <p className="text-neutral-500 text-sm">
            &copy; {new Date().getFullYear()} Social Recall. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
