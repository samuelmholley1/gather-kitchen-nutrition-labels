/**
 * API Route: POST /api/report-issue
 * 
 * Handles nutrition label issue reports with per-ingredient flagging.
 * Validates payload, rate limits, and sends email notifications via Zoho SMTP.
 * 
 * Implementation Checklist:
 * [x] Validation with Zod schema
 * [x] Rate limiting (5/min per IP + recipeId)
 * [x] Honeypot protection
 * [x] SMTP email sending via Zoho
 * [x] Structured HTML/text email with flagged ingredients table
 * [x] Error logging and user-friendly error responses
 * [ ] Persist to DB (optional - future enhancement)
 * [ ] Admin dashboard for issue viewing (optional - future enhancement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { ReportPayloadSchema } from '@/lib/validation/report';
import { isRateLimited, getRemainingQuota, getResetTime } from '@/lib/security/rateLimit';
import { sendReportEmail } from '@/lib/email/sendReportEmail';

/**
 * Extract client IP from request.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Sanitize comment by removing HTML and limiting to plain text.
 */
function sanitizeComment(comment: string): string {
  // Strip HTML tags
  let cleaned = comment.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
  // Trim whitespace
  return cleaned.trim();
}

/**
 * Build HTML email body.
 */
function buildHtmlEmail(
  recipeName: string,
  recipeId: string,
  timestamp: string,
  flaggedIngredients: any[],
  reasonType: string,
  comment: string | undefined,
  totals: any,
  breakdown: any,
  laypersonBreakdown: string
): string {
  const flaggedCount = flaggedIngredients.length;

  // Build ingredients table rows
  const ingredientRows = flaggedIngredients
    .map(
      (ing) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; font-family: monospace; font-size: 13px;">${escapeHtml(ing.name)}</td>
      <td style="padding: 10px; text-align: right; font-size: 13px;">${ing.quantity || '—'}</td>
      <td style="padding: 10px; text-align: center; font-size: 13px;">${ing.units || '—'}</td>
    </tr>
  `
    )
    .join('');

  // Format totals table if available
  let totalsHtml = '';
  if (totals && Object.keys(totals).length > 0) {
    const totalsRows = Object.entries(totals)
      .map(
        ([key, value]) => `
      <tr>
        <td style="padding: 8px; font-weight: 500;">${escapeHtml(key)}</td>
        <td style="padding: 8px; text-align: right;">${value}</td>
      </tr>
    `
      )
      .join('');

    totalsHtml = `
    <h3 style="margin-top: 20px; color: #333; font-size: 16px;">Calculated Totals</h3>
    <table style="width: 100%; border-collapse: collapse; background: #f9f9f9;">
      ${totalsRows}
    </table>
  `;
  }

  // Breakdown details (collapsible in email)
  const breakdownJson = breakdown
    ? escapeHtml(JSON.stringify(breakdown, null, 2))
    : 'N/A';

  const reasonDisplay =
    reasonType === 'self_evident' ? 'Error is self-evident' : `${comment || 'User comment provided'}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #e74c3c; font-size: 24px; margin: 0 0 10px 0;">🚨 Nutrition Label Report</h1>
    <p style="color: #666; margin: 0 0 20px 0; font-size: 14px;">${timestamp} UTC</p>

    <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #e74c3c;">
      <p style="margin: 0; font-size: 14px; color: #555;">
        <strong>Recipe:</strong> ${escapeHtml(recipeName)}<br>
        <strong>Recipe ID:</strong> ${escapeHtml(recipeId)}<br>
        <strong>Reason:</strong> ${reasonDisplay}<br>
        <strong>Flagged Ingredients:</strong> ${flaggedCount}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #333; font-weight: 500;">
        ${escapeHtml(laypersonBreakdown)}
      </p>
    </div>

    <h2 style="color: #333; font-size: 18px; margin: 20px 0 10px 0;">Flagged Ingredients</h2>
    <table style="width: 100%; border-collapse: collapse; background: #f9f9f9; font-size: 14px;">
      <thead>
        <tr style="background: #e8f5e9;">
          <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #4caf50;">Ingredient</th>
          <th style="padding: 10px; text-align: right; font-weight: 600; border-bottom: 2px solid #4caf50;">Qty</th>
          <th style="padding: 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #4caf50;">Unit</th>
        </tr>
      </thead>
      <tbody>
        ${ingredientRows}
      </tbody>
    </table>

    ${totalsHtml}

    ${
      comment
        ? `
    <h3 style="margin-top: 20px; color: #333; font-size: 16px;">User Comment</h3>
    <div style="background: #fff9e6; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; word-wrap: break-word;">
      <p style="margin: 0; font-size: 14px; white-space: pre-wrap; color: #333;">${escapeHtml(comment)}</p>
    </div>
  `
        : ''
    }

    <details style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 6px; font-size: 12px;">
      <summary style="cursor: pointer; font-weight: 500; color: #0066cc;">Show calculation breakdown (JSON)</summary>
      <pre style="margin: 10px 0 0 0; overflow-x: auto; background: #fff; padding: 10px; border-radius: 4px; font-size: 11px; line-height: 1.3;">${breakdownJson}</pre>
    </details>

    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      This is an automated report from Gather Kitchen's nutrition label system.
      <br>Do not reply to this email. Contact support@gather.kitchen for assistance.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Build plain text email body.
 */
function buildTextEmail(
  recipeName: string,
  recipeId: string,
  timestamp: string,
  flaggedIngredients: any[],
  reasonType: string,
  comment: string | undefined,
  totals: any,
  breakdown: any,
  laypersonBreakdown: string
): string {
  const reasonDisplay =
    reasonType === 'self_evident' ? 'Error is self-evident' : `${comment || 'User comment provided'}`;

  let text = `🚨 NUTRITION LABEL REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Report Time: ${timestamp} UTC
Recipe: ${recipeName}
Recipe ID: ${recipeId}
Reason: ${reasonDisplay}
Flagged Ingredients: ${flaggedIngredients.length}

${laypersonBreakdown}

FLAGGED INGREDIENTS
─────────────────────────────────────────────────────

${flaggedIngredients
  .map(
    (ing) =>
      `• ${ing.name}${ing.quantity ? ` (${ing.quantity}${ing.units ? ` ${ing.units}` : ''})` : ''}`
  )
  .join('\n')}

`;

  if (totals && Object.keys(totals).length > 0) {
    text += `CALCULATED TOTALS
─────────────────────────────────────────────────────

${Object.entries(totals)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

`;
  }

  if (comment) {
    text += `USER COMMENT
─────────────────────────────────────────────────────

${comment}

`;
  }

  text += `BREAKDOWN SNAPSHOT (JSON)
─────────────────────────────────────────────────────

${JSON.stringify(breakdown, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated report from Gather Kitchen's nutrition label system.
Do not reply to this email. Contact support@gather.kitchen for assistance.
  `;

  return text;
}

/**
 * Simple HTML escape.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * POST /api/report-issue
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON body
    const body = await request.json();

    // Honeypot check: reject if favorite_color is non-empty
    if (body.favorite_color && body.favorite_color.trim().length > 0) {
      console.warn('Honeypot triggered for report issue submission');
      // Return 400 but without revealing honeypot to prevent probing
      return NextResponse.json(
        { error: 'Invalid submission' },
        { status: 400 }
      );
    }

    // Validate payload with Zod
    const validationResult = ReportPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return NextResponse.json(
        {
          error: 'Validation failed',
          fieldErrors: errors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = validationResult.data;

    // Rate limiting: 5 reports per minute per IP + recipeId (+ ingredientId if applicable)
    const clientIp = getClientIp(request);
    const rateLimitKey = payload.context === 'ingredient' ? payload.ingredientId : undefined;
    if (isRateLimited(clientIp, payload.recipeId, rateLimitKey)) {
      const resetTime = getResetTime(clientIp, payload.recipeId, rateLimitKey);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

      return NextResponse.json(
        {
          error: 'Too many reports. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Generate report ID
    const reportId = randomUUID();

    // Handle ingredient-specific vs recipe-wide reporting
    let flaggedIngredients: any[] = [];
    let subject: string;
    let laypersonBreakdown: string;

    // Extract layperson summary from breakdownSnapshot if available
    const laypersonSummary = typeof payload.breakdownSnapshot === 'object' && 
      payload.breakdownSnapshot !== null && 
      'laypersonSummary' in payload.breakdownSnapshot 
        ? (payload.breakdownSnapshot as any).laypersonSummary 
        : '';

    if (payload.context === 'ingredient') {
      // Single ingredient reporting
      flaggedIngredients = [{
        id: payload.ingredientId,
        name: payload.ingredientName,
        quantity: null, // Will be populated from breakdown if available
        units: null,
      }];
      subject = `[Nutrition Label Report] ${payload.recipeName} – INGREDIENT: ${payload.ingredientName}`;
      laypersonBreakdown = laypersonSummary || `Issue reported for ingredient "${payload.ingredientName}" in recipe "${payload.recipeName}".`;
    } else {
      // Recipe-wide reporting
      flaggedIngredients = [];
      subject = `[Nutrition Label Report] ${payload.recipeName}`;
      laypersonBreakdown = laypersonSummary || `Issue reported with recipe "${payload.recipeName}".`;
    }

    // Sanitize comment if provided
    const sanitizedComment =
      payload.reasonType === 'comment'
        ? sanitizeComment(payload.comment || '')
        : undefined;

    // Build email
    const timestamp = new Date().toISOString();
    const recipeName = payload.recipeName;
    const recipeId = payload.recipeId;
    const reasonType = payload.reasonType;
    const htmlBody = buildHtmlEmail(
      recipeName,
      recipeId,
      timestamp,
      flaggedIngredients,
      reasonType,
      sanitizedComment,
      payload.totals,
      payload.breakdownSnapshot,
      laypersonBreakdown
    );
    const textBody = buildTextEmail(
      recipeName,
      recipeId,
      timestamp,
      flaggedIngredients,
      reasonType,
      sanitizedComment,
      payload.totals,
      payload.breakdownSnapshot,
      laypersonBreakdown
    );

    // Send email
    const reportTo = process.env.REPORT_TO || 'sam@samuelholley.com';
    const ccRecipients = payload.ccInfoGather ? ['info@gather.kitchen'] : [];
    
    try {
      await sendReportEmail({
        to: reportTo,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        subject,
        html: htmlBody,
        text: textBody,
      });
    } catch (emailError) {
      const errorMessage =
        emailError instanceof Error ? emailError.message : 'Unknown error';
      console.error('Failed to send report email:', errorMessage);
      // Still return 201 so client knows report was accepted, but log the email failure
      console.error(
        `Report ${reportId} accepted but email delivery failed: ${errorMessage}`
      );
    }

    // Return success response
    return NextResponse.json(
      {
        reportId,
        timestamp,
        flaggedCount: flaggedIngredients.length,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Report issue API error:', message, error);

    return NextResponse.json(
      {
        error: 'Internal server error. Please try again later.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
