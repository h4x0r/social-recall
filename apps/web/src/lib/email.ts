/**
 * Email utility using Resend
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Social Recall <noreply@notifications.socialrecall.now>';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

/**
 * Send data deletion confirmation email with verification link
 */
export async function sendDeletionConfirmationEmail(
  email: string,
  token: string,
  baseUrl: string
) {
  const confirmUrl = `${baseUrl}/api/privacy/confirm-deletion?token=${token}`;

  return sendEmail({
    to: email,
    subject: 'Confirm Your Data Deletion Request - Social Recall',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #1a1a1a; border-radius: 8px; border: 1px solid #333;">
          <tr>
            <td style="padding: 40px; text-align: center; border-bottom: 2px solid #D4AF37;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 24px; font-weight: 600;">◇ Social Recall ◇</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px;">Confirm Data Deletion Request</h2>
              <p style="margin: 0 0 20px; color: #999999; font-size: 16px; line-height: 1.6;">
                We received a request to delete your data from Social Recall. To confirm this request, click the button below.
              </p>
              <p style="margin: 0 0 30px; color: #999999; font-size: 14px; line-height: 1.6;">
                <strong style="color: #ef4444;">This action is irreversible.</strong> The following will be permanently deleted:
              </p>
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #999999; font-size: 14px; line-height: 1.8;">
                <li>Your notes and browsing history</li>
                <li>Your account and settings</li>
                <li>Your consent record will be anonymized (IP address redacted)</li>
              </ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${confirmUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ef4444; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Confirm Deletion
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #666666; font-size: 12px; line-height: 1.6;">
                If you didn't request this, you can safely ignore this email. This link expires in 24 hours.
              </p>
              <p style="margin: 20px 0 0; color: #666666; font-size: 12px; line-height: 1.6;">
                Can't click the button? Copy and paste this link into your browser:<br>
                <a href="${confirmUrl}" style="color: #D4AF37; word-break: break-all;">${confirmUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #333; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Social Recall. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Confirm Data Deletion Request - Social Recall

We received a request to delete your data from Social Recall.

To confirm this request, visit: ${confirmUrl}

This action is irreversible. The following will be permanently deleted:
- Your notes and browsing history
- Your account and settings
- Your consent record will be anonymized (IP address redacted)

If you didn't request this, you can safely ignore this email.
This link expires in 24 hours.

© ${new Date().getFullYear()} Social Recall
    `,
  });
}

/**
 * Send deletion complete confirmation email
 */
export async function sendDeletionCompleteEmail(email: string) {
  return sendEmail({
    to: email,
    subject: 'Your Data Has Been Deleted - Social Recall',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #1a1a1a; border-radius: 8px; border: 1px solid #333;">
          <tr>
            <td style="padding: 40px; text-align: center; border-bottom: 2px solid #D4AF37;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 24px; font-weight: 600;">◇ Social Recall ◇</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px;">Data Deletion Complete</h2>
              <p style="margin: 0 0 20px; color: #999999; font-size: 16px; line-height: 1.6;">
                Your data has been permanently deleted from Social Recall.
              </p>
              <p style="margin: 0 0 20px; color: #999999; font-size: 14px; line-height: 1.6;">
                What was deleted:
              </p>
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #999999; font-size: 14px; line-height: 1.8;">
                <li>Your notes and browsing history</li>
                <li>Your account and settings</li>
                <li>Your consent record has been anonymized</li>
              </ul>
              <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                If you have the extension installed, please uninstall it to stop any future data collection.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #333; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Social Recall. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Data Deletion Complete - Social Recall

Your data has been permanently deleted from Social Recall.

What was deleted:
- Your notes and browsing history
- Your account and settings
- Your consent record has been anonymized

If you have the extension installed, please uninstall it to stop any future data collection.

© ${new Date().getFullYear()} Social Recall
    `,
  });
}
