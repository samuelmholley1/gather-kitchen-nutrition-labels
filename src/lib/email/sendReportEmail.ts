/**
 * Email utility for sending report issue notifications via Zoho SMTP.
 * Uses Nodemailer to send HTML and text emails.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: Transporter | null = null;

/**
 * Initialize nodemailer transporter with Zoho SMTP settings.
 */
function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const user = process.env.ZOHO_USER;
  const password = process.env.ZOHO_APP_PASSWORD;
  const host = process.env.ZOHO_HOST || 'smtp.zoho.com';
  const port = parseInt(process.env.ZOHO_PORT || '465', 10);
  const secure = process.env.ZOHO_SECURE !== 'false';

  if (!user || !password) {
    throw new Error(
      'Zoho SMTP configuration missing: ZOHO_USER and ZOHO_APP_PASSWORD required'
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass: password,
    },
  });

  return transporter;
}

/**
 * Send a report issue email.
 * @param payload - Email configuration (to, subject, html, text)
 * @returns Promise resolving to message ID
 */
export async function sendReportEmail(payload: EmailPayload): Promise<string> {
  try {
    const transport = getTransporter();
    const from = process.env.ZOHO_USER || 'alerts@samuelholley.com';

    const result = await transport.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: 'support@gather.kitchen',
    });

    return result.messageId || '';
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown email error';
    throw new Error(`Failed to send report email: ${message}`);
  }
}

/**
 * Verify SMTP connection (for testing/debugging).
 */
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown verification error';
    console.error('SMTP verification failed:', message);
    return false;
  }
}
