import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Social Recall Chrome Extension and Web Application",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
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

          <section>
            <h2 className="text-2xl font-display mb-4">Data We Collect</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">LinkedIn Profile Data</h3>
            <p className="text-neutral-300 leading-relaxed mb-4">
              When you visit a LinkedIn profile page, the Extension extracts the following
              publicly visible information:
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
              <strong>Important:</strong> We only collect information that is publicly visible on the
              LinkedIn profile page you are viewing. We do not access private messages, connection
              lists, or any data that requires LinkedIn login credentials.
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
              <li><strong>LinkedIn:</strong> We read publicly visible profile data. We do not access your LinkedIn account.</li>
              <li><strong>Google Authentication:</strong> Used only for sign-in. We receive only basic profile info.</li>
              <li><strong>Vercel:</strong> Hosts our web application and processes AI analysis requests.</li>
              <li><strong>Supabase:</strong> Provides database and authentication services (US-based).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Your Rights</h2>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 ml-4">
              <li><strong>Access:</strong> View all locally stored data via Chrome developer tools.</li>
              <li><strong>Delete:</strong> Clear local data by uninstalling the Extension; delete cloud data via settings.</li>
              <li><strong>Export:</strong> Download your contacts and notes in JSON format.</li>
            </ul>
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
              <li>Email: privacy@social-recall.app</li>
              <li>GitHub: <a href="https://github.com/h4x0r/social-recall/issues" className="text-blue-400 hover:underline">github.com/h4x0r/social-recall/issues</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display mb-4">Legal Basis for Processing (GDPR)</h2>
            <p className="text-neutral-300 leading-relaxed">
              For users in the European Economic Area, we process your data based on:
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 ml-4 mt-2">
              <li><strong>Consent:</strong> You choose to install and use the Extension</li>
              <li><strong>Legitimate Interest:</strong> Providing the service you requested</li>
              <li><strong>Contract:</strong> If you create an account, fulfilling our service agreement</li>
            </ul>
            <p className="text-neutral-400 mt-4 text-sm">
              You may withdraw consent at any time by uninstalling the Extension.
            </p>
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
