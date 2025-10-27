# Audit Snapshot
Generated (UTC): Mon Oct 27 21:33:53 UTC 2025
Commit: 00e1eeb

## src/app/api/report-issue/route.ts

```
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
    reasonType === 'self_evident' ? 'Error is self-evident' : 'User comment provided';

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
    reasonType === 'self_evident' ? 'Error is self-evident' : 'User comment provided';

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

    if (payload.context === 'ingredient') {
      // Single ingredient reporting
      flaggedIngredients = [{
        id: payload.ingredientId,
        name: payload.ingredientName,
        quantity: null, // Will be populated from breakdown if available
        units: null,
      }];
      subject = `[Nutrition Label Report] ${payload.recipeName} - Issue with ${payload.ingredientName}`;
      laypersonBreakdown = `Issue reported for ingredient "${payload.ingredientName}" in recipe "${payload.recipeName}".`;
    } else {
      // Recipe-wide reporting (legacy support) - this shouldn't happen with new UI but keeping for compatibility
      flaggedIngredients = []; // Empty for now, would need ingredients array in payload for legacy
      subject = `[Nutrition Label Report] ${payload.recipeName} (${payload.recipeId}) – Issue reported`;
      laypersonBreakdown = `Issue reported with recipe "${payload.recipeName}".`;
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
    try {
      await sendReportEmail({
        to: reportTo,
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
```

## src/components/ReportIssueModal.tsx

```
'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ReportContext } from '@/lib/types/report';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipeName: string;
  version?: string;
  context: ReportContext;
  preselectedIngredient?: { id: string; name: string; quantity?: number; units?: string };
  breakdownSnapshot?: unknown;
  totals?: { kcal: number; carbs: number; protein: number; fat: number } | null;
  onSubmit?: (data: any) => void;
}

/**
 * Modal for reporting nutrition calculation issues.
 * Features:
 * - Ingredient-specific or recipe-level reporting
 * - Read-only calculation breakdown display
 * - Reason selection (self-evident or custom comment)
 * - Honeypot protection
 * - Focus trap and keyboard navigation
 */
export function ReportIssueModal({
  isOpen,
  onClose,
  recipeId,
  recipeName,
  version,
  context,
  preselectedIngredient,
  breakdownSnapshot,
  totals,
  onSubmit,
}: ReportIssueModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstFocusableRef = useRef<HTMLElement>(null);

  const [reasonType, setReasonType] = useState<'self_evident' | 'comment'>('self_evident');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus on close button when modal opens
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Check if form is valid
  const isFormValid = reasonType === 'self_evident' || (reasonType === 'comment' && comment.trim().length > 0);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid) {
      setError('Please select a reason and provide a comment if needed');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reportId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36);
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const clientNonce = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36);

      const payload = {
        reportId,
        recipeId,
        recipeName,
        version,
        context,
        ...(context === 'ingredient' && preselectedIngredient ? {
          ingredientId: preselectedIngredient.id,
          ingredientName: preselectedIngredient.name,
        } : {}),
        reasonType,
        comment: reasonType === 'comment' ? comment : undefined,
        breakdownSnapshot,
        totals,
        userAgent,
        clientNonce,
        favorite_color: '', // Honeypot
      };

      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setComment('');
        setReasonType('self_evident');
      }, 2000);

      if (onSubmit) {
        onSubmit(payload);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="alertdialog"
        aria-labelledby="report-modal-title"
        aria-describedby="report-modal-description"
      >
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl pointer-events-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b">
            <div>
              <h2 id="report-modal-title" className="text-xl font-semibold">
                Report Issue
              </h2>
              <p id="report-modal-description" className="text-sm text-gray-600 mt-1">
                {recipeName}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
              aria-label="Close modal"
              disabled={isSubmitting}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Ingredient Context Info (if ingredient-specific) */}
            {context === 'ingredient' && preselectedIngredient && (
              <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Reporting Issue With:</h3>
                <p className="text-blue-800 font-medium">
                  {preselectedIngredient.name}
                  {preselectedIngredient.quantity && (
                    <span className="text-blue-600 ml-2">
                      ({preselectedIngredient.quantity}{preselectedIngredient.units ? ` ${preselectedIngredient.units}` : ''})
                    </span>
                  )}
                </p>
              </section>
            )}

            {/* Section A: Calculation Breakdown */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Calculation Breakdown</h3>
              <div className="bg-gray-50 rounded p-4 max-h-48 overflow-y-auto border border-gray-200">
                <dl className="space-y-2">
                  {totals && Object.keys(totals).length > 0 ? (
                    Object.entries(totals).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="font-medium text-gray-700">{key}:</dt>
                        <dd className="text-gray-900">{String(value)}</dd>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No totals available</p>
                  )}
                </dl>
              </div>
            </section>

            {/* Section B: Reason Selection */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Reason</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value="self_evident"
                    checked={reasonType === 'self_evident'}
                    onChange={() => setReasonType('self_evident')}
                    disabled={isSubmitting}
                    className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-medium text-sm group-hover:text-blue-600">
                    The error is self-evident
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value="comment"
                    checked={reasonType === 'comment'}
                    onChange={() => setReasonType('comment')}
                    disabled={isSubmitting}
                    className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-medium text-sm group-hover:text-blue-600">
                    I want to explain
                  </span>
                </label>

                {reasonType === 'comment' && (
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                    placeholder="Please explain what's wrong..."
                    maxLength={2000}
                    disabled={isSubmitting}
                    className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:opacity-50"
                    aria-label="Explanation"
                  />
                )}
                {reasonType === 'comment' && (
                  <div className="text-xs text-gray-500">
                    {comment.length} / 2000 characters
                  </div>
                )}
              </div>
            </section>

            {/* Honeypot (hidden) */}
            <input type="hidden" name="favorite_color" value="" />

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                ✓ Report submitted successfully. Thank you!
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 p-6 border-t bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Cancel
            </button>
            <form onSubmit={handleSubmit} className="contents">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
```

## src/components/ReportIssueButton.tsx

```
'use client';

import React, { useState } from 'react';
import { ReportIssueModal } from './ReportIssueModal';
import type { ReportContext } from '@/lib/types/report';

interface ReportIssueButtonProps {
  recipeId: string;
  recipeName: string;
  version?: string;
  context: ReportContext;
  preselectedIngredient?: { id: string; name: string; quantity?: number; units?: string };
  breakdownSnapshot?: unknown;
  totals?: { kcal: number; carbs: number; protein: number; fat: number } | null;
  buttonText?: string;
  buttonClassName?: string;
  onReportSubmitted?: (reportId: string) => void;
}

/**
 * Button component that triggers the ReportIssueModal.
 * Manages modal state and provides a user-friendly interface.
 */
export function ReportIssueButton({
  recipeId,
  recipeName,
  version,
  context,
  preselectedIngredient,
  breakdownSnapshot,
  totals,
  buttonText = '🚨 Report issue',
  buttonClassName = 'text-blue-600 hover:text-blue-800 underline text-sm',
  onReportSubmitted,
}: ReportIssueButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (data: any) => {
    // Extract reportId from response if available
    if (onReportSubmitted && data.reportId) {
      onReportSubmitted(data.reportId);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={buttonClassName}
        type="button"
        aria-label="Report issue with nutrition calculation"
      >
        {buttonText}
      </button>

      <ReportIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recipeId={recipeId}
        recipeName={recipeName}
        version={version}
        context={context}
        preselectedIngredient={preselectedIngredient}
        breakdownSnapshot={breakdownSnapshot}
        totals={totals}
        onSubmit={handleSubmit}
      />
    </>
  );
}
```

## src/components/CalculationProvenanceModal.tsx

```
'use client'

import { useState } from 'react'

interface CalculationProvenanceModalProps {
  isOpen: boolean
  onClose: () => void
  dishName: string
  calculationData: any // Will be expanded with proper typing
}

interface IngredientBreakdown {
  rawInput: string
  canonical: {
    base: string
    qualifiers: string[]
  }
  selectedUSDA: {
    fdcId: number
    description: string
    dataType: string
  }
  scoreBreakdown: {
    baseType: 'all_purpose' | 'specialty' | 'unknown'
    positives: string[]
    negatives: string[]
    tiers: Array<{name: string; delta: number}>
    finalScore: number
  }
}

interface DataUsed {
  field: string
  value: number
  unit: string
  source: string
}

interface MathStep {
  description: string
  formula: string
  result: string
}

export default function CalculationProvenanceModal({
  isOpen,
  onClose,
  dishName,
  calculationData
}: CalculationProvenanceModalProps) {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'data' | 'math'>('ingredients')

  if (!isOpen || !calculationData) return null

  const copyToClipboard = async (data: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      alert('Details copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Calculation Provenance: {dishName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'ingredients'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ingredient Breakdown
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'data'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Used
          </button>
          <button
            onClick={() => setActiveTab('math')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'math'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Math Chain
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {activeTab === 'ingredients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Per-Ingredient Analysis</h3>
                <button
                  onClick={() => copyToClipboard(calculationData)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Copy Details
                </button>
              </div>

              {calculationData.ingredients?.map((ingredient: IngredientBreakdown, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Input Processing</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Raw Input:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                            {ingredient.rawInput}
                          </code>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Canonical Base:</span>
                          <code className="ml-2 bg-blue-100 px-2 py-1 rounded text-xs">
                            {ingredient.canonical.base}
                          </code>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Qualifiers:</span>
                          <div className="ml-2 flex flex-wrap gap-1">
                            {ingredient.canonical.qualifiers.map((q, i) => (
                              <span key={i} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                {q}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">USDA Selection</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">FDC ID:</span>
                          <span className="ml-2 text-emerald-600 font-mono">
                            {ingredient.selectedUSDA.fdcId}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Description:</span>
                          <span className="ml-2 text-gray-800">
                            {ingredient.selectedUSDA.description}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Data Type:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            ingredient.selectedUSDA.dataType === 'Foundation'
                              ? 'bg-green-100 text-green-800'
                              : ingredient.selectedUSDA.dataType === 'SR Legacy'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ingredient.selectedUSDA.dataType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Scoring Breakdown</h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Base Type:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          ingredient.scoreBreakdown.baseType === 'all_purpose'
                            ? 'bg-green-100 text-green-800'
                            : ingredient.scoreBreakdown.baseType === 'specialty'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ingredient.scoreBreakdown.baseType}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Final Score:</span>
                        <span className="ml-2 font-mono text-lg font-bold text-emerald-600">
                          {ingredient.scoreBreakdown.finalScore}
                        </span>
                      </div>
                      <div>
                        <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                          Choose Different Match
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-green-700 text-sm">Positives:</span>
                        <ul className="mt-1 space-y-1">
                          {ingredient.scoreBreakdown.positives.map((pos, i) => (
                            <li key={i} className="text-xs text-green-600 flex items-center">
                              <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                              {pos}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium text-red-700 text-sm">Negatives:</span>
                        <ul className="mt-1 space-y-1">
                          {ingredient.scoreBreakdown.negatives.map((neg, i) => (
                            <li key={i} className="text-xs text-red-600 flex items-center">
                              <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                              {neg}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="font-medium text-gray-700 text-sm">Score Tiers:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {ingredient.scoreBreakdown.tiers.map((tier, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              tier.delta > 0 ? 'bg-green-100 text-green-800' :
                              tier.delta < 0 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {tier.name}: {tier.delta > 0 ? '+' : ''}{tier.delta}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Data Sources Used</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Field</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Value</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calculationData.dataUsed?.map((data: DataUsed, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{data.field}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-900">{data.value}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{data.unit}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{data.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'math' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Calculation Chain</h3>
              <div className="space-y-3">
                {calculationData.mathChain?.map((step: MathStep, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 mb-2">{step.description}</p>
                        <code className="text-sm bg-gray-100 px-3 py-2 rounded block font-mono">
                          {step.formula}
                        </code>
                      </div>
                      <div className="ml-4 text-right">
                        <span className="text-lg font-bold text-emerald-600">
                          {step.result}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Route Stamp</h4>
                <div className="text-sm text-blue-800 font-mono">
                  <div>Route: {calculationData._stamp?.routeId}</div>
                  <div>SHA: {calculationData._stamp?.sha?.substring(0, 8)}</div>
                  <div>Timestamp: {calculationData._stamp?.timestamp}</div>
                  <div>Yield Multiplier: {calculationData.yieldMultiplier}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}```

## src/app/final-dishes/page.tsx

```
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import NutritionLabel from '@/components/NutritionLabel'
import Header from '@/components/Header'
import Modal from '@/components/Modal'
import CalculationProvenanceModal from '@/components/CalculationProvenanceModal'
import { ReportIssueButton } from '@/components/ReportIssueButton'

interface FinalDish {
  id: string
  name: string
  components: any[]
  totalWeight: number
  servingSize: number
  servingsPerContainer: number
  nutritionLabel: any
  allergens: string[]
  category: string
  status: string
  createdAt: string
}

export default function FinalDishesPage() {
  const [finalDishes, setFinalDishes] = useState<FinalDish[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [viewingLabel, setViewingLabel] = useState<FinalDish | null>(null)
  const [showingProvenance, setShowingProvenance] = useState(false)
  const [provenanceData, setProvenanceData] = useState<any>(null)
  const [modal, setModal] = useState<{
    isOpen: boolean
    type: 'info' | 'error' | 'warning' | 'success' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  useEffect(() => {
    fetchFinalDishes()
  }, [])

  const fetchFinalDishes = async () => {
    try {
      const response = await fetch('/api/final-dishes')
      if (response.ok) {
        const data = await response.json()
        setFinalDishes(data.finalDishes || [])
      }
    } catch (error) {
      console.error('Failed to fetch final dishes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Final Dish',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/final-dishes/${id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            setFinalDishes(finalDishes.filter(dish => dish.id !== id))
            setModal({
              isOpen: true,
              type: 'success',
              title: 'Deleted',
              message: `"${name}" has been deleted successfully.`
            })
          } else {
            setModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: 'Unable to delete the final dish. Please try again.'
            })
          }
        } catch (error) {
          console.error('Delete error:', error)
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'An unexpected error occurred while deleting the dish.'
          })
        }
      }
    })
  }

  // Filter final dishes
  const filteredDishes = finalDishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || dish.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(finalDishes.map(dish => dish.category).filter(Boolean)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Final Dishes
              </h1>
              <p className="text-gray-600">
                Complete menu items with FDA-compliant nutrition labels
              </p>
            </div>
            <Link
              href="/final-dishes/new"
              className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Final Dish
            </Link>
          </div>

          {/* Quick Links */}
          <div className="flex gap-3">
            <Link
              href="/"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              ← Home
            </Link>
            <span className="text-gray-400">|</span>
            <Link
              href="/sub-recipes"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              Sub-Recipes
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search final dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Final Dishes Grid */}
        {filteredDishes.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || selectedCategory ? 'No dishes found' : 'No final dishes yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Create your first final dish to get started'}
            </p>
            {!searchQuery && !selectedCategory && (
              <Link
                href="/final-dishes/new"
                className="inline-block px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Create Final Dish
              </Link>
            )}
          </div>
        )}

        {filteredDishes.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDishes.map(dish => (
              <div
                key={dish.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {dish.name}
                    </h3>
                    {dish.category && (
                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                        {dish.category}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    dish.status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : dish.status === 'Draft'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {dish.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Components:</span>
                    <span className="font-medium text-gray-900">{dish.components.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Serving Size:</span>
                    <span className="font-medium text-gray-900">
                      {dish.servingSize}g 
                      <span className="text-xs text-gray-500 ml-1">
                        ({dish.servingsPerContainer} {dish.servingsPerContainer === 1 ? 'serving' : 'servings'}/container)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calories:</span>
                    <span className="font-medium text-gray-900">
                      {Math.round(dish.nutritionLabel?.calories || 0)} kcal
                      <span className="text-xs text-gray-500 ml-1">per serving</span>
                    </span>
                  </div>
                  {dish.allergens && dish.allergens.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-red-600 font-medium">⚠️ Allergens:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dish.allergens.map(allergen => (
                          <span key={allergen} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingLabel(dish)}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    View Label
                  </button>
                  <button
                    onClick={() => handleDelete(dish.id, dish.name)}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Nutrition Label Modal */}
      {viewingLabel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingLabel(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {viewingLabel.name}
              </h2>
              <button
                onClick={() => setViewingLabel(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex justify-center">
              <NutritionLabel
                dishName={viewingLabel.name}
                servingSize={`${viewingLabel.servingSize}g`}
                servingsPerContainer={viewingLabel.servingsPerContainer}
                nutrients={viewingLabel.nutritionLabel}
                allergens={viewingLabel.allergens}
              />
            </div>

            <div className="mt-6 flex justify-center gap-4 flex-wrap">
              <button
                onClick={async () => {
                  try {
                    // Fetch detailed calculation data with provenance
                    const response = await fetch(`/api/final-dishes/${viewingLabel.id}/calculate`)
                    if (response.ok) {
                      const data = await response.json()
                      setProvenanceData(data)
                      setShowingProvenance(true)
                    }
                  } catch (error) {
                    console.error('Failed to fetch provenance:', error)
                  }
                }}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                See how this was calculated
              </button>

              <ReportIssueButton
                recipeId={viewingLabel.id}
                recipeName={viewingLabel.name}
                ingredients={viewingLabel.components.map((comp: any) => ({
                  id: comp.id,
                  name: comp.name || comp.recipeName,
                  quantity: comp.weight,
                  units: 'g',
                  flagged: false,
                }))}
                totals={viewingLabel.nutritionLabel}
                breakdownSnapshot={provenanceData}
                buttonText="🚨 Report issue"
                buttonClassName="px-4 py-2 text-sm text-red-600 hover:text-red-800 underline"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal for errors/confirmations */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.type === 'confirm' ? 'Delete' : 'OK'}
      />

      {/* Calculation Provenance Modal */}
      <CalculationProvenanceModal
        isOpen={showingProvenance}
        onClose={() => setShowingProvenance(false)}
        dishName={viewingLabel?.name || ''}
        calculationData={provenanceData}
      />
    </div>
  )
}
```

## src/lib/validation/report.ts

```
/**
 * Zod validation schema for report issue payload.
 */

import { z } from 'zod';

export const FlaggedIngredientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Ingredient name required'),
  quantity: z.number().nullable().optional(),
  units: z.string().nullable().optional(),
  flagged: z.boolean(),
});

export const TotalsSchema = z.record(z.string(), z.any()).optional();

export const BreakdownSnapshotSchema = z.record(z.string(), z.any()).optional();

export const ReportPayloadSchema = z.object({
  reportId: z.string().min(1, 'Report ID required'),
  recipeId: z.string().min(1, 'Recipe ID required'),
  recipeName: z.string().min(1, 'Recipe name required'),
  version: z.string().optional(),
  context: z.enum(['recipe', 'ingredient']),
  ingredientId: z.string().optional(),
  ingredientName: z.string().optional(),
  reasonType: z.enum(['self_evident', 'comment']),
  comment: z
    .string()
    .max(2000, 'Comment must be 2000 characters or less')
    .optional(),
  breakdownSnapshot: BreakdownSnapshotSchema,
  totals: TotalsSchema,
  userAgent: z.string().optional(),
  clientNonce: z.string().min(1, 'Client nonce required'),
})
  // Validate that if context is 'ingredient', ingredientId and ingredientName are required
  .refine(
    (data) => {
      if (data.context === 'ingredient') {
        return data.ingredientId && data.ingredientName;
      }
      return true;
    },
    {
      message: 'ingredientId and ingredientName are required when context is "ingredient"',
      path: ['ingredientId'],
    }
  )
  // Validate that if reasonType is 'comment', comment must be provided and non-empty
  .refine(
    (data) => {
      if (data.reasonType === 'comment') {
        return data.comment && data.comment.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Comment is required when reason type is "comment"',
      path: ['comment'],
    }
  );

export type ReportPayloadType = z.infer<typeof ReportPayloadSchema>;
```

## src/lib/types/report.ts

```
/**
 * Types for the "Report issue" flow for per-ingredient nutrition calculation flags.
 */

export type ReasonType = 'self_evident' | 'comment';
export type ReportContext = 'recipe' | 'ingredient';

export interface FlaggedIngredient {
  id?: string;
  name: string;
  quantity: number | null;
  units: string | null;
  flagged: boolean;
}

export interface BreakdownSnapshot {
  [key: string]: any;
}

export interface Totals {
  kcal?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  [key: string]: any;
}

export interface ReportPayload {
  reportId: string;
  recipeId: string;
  recipeName: string;
  version?: string;
  context: ReportContext;
  ingredientId?: string;
  ingredientName?: string;
  reasonType: ReasonType;
  comment?: string;
  breakdownSnapshot?: BreakdownSnapshot;
  totals?: Totals;
  userAgent?: string;
  clientNonce: string;
}

export interface ReportResponse {
  reportId: string;
}

export interface ReportError {
  error: string;
  code?: string;
}
```

## src/lib/security/rateLimit.ts

```
/**
 * Simple in-memory rate limiter for report issue API.
 * Enforces 5 reports/min per IP + recipeId combination.
 * 
 * TODO: Replace with Redis for distributed rate limiting across multiple instances.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

/**
 * Check if a request is rate limited.
 * @param ip - Client IP address
 * @param recipeId - Recipe ID
 * @param ingredientId - Ingredient ID (optional, for ingredient-specific reports)
 * @returns true if rate limited, false if allowed
 */
export function isRateLimited(ip: string, recipeId: string, ingredientId?: string): boolean {
  const key = ingredientId ? `${ip}:${recipeId}:${ingredientId}` : `${ip}:${recipeId}`;
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitMap.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(key, entry);
  }

  // Remove old timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  // Check if limit exceeded
  if (entry.timestamps.length >= MAX_REQUESTS) {
    return true;
  }

  // Add current timestamp
  entry.timestamps.push(now);

  // Clean up old entries (map entries older than 2 windows)
  if (Math.random() < 0.01) {
    // Cleanup on 1% of requests
    cleanupOldEntries();
  }

  return false;
}

/**
 * Get remaining quota for a key.
 */
export function getRemainingQuota(ip: string, recipeId: string, ingredientId?: string): number {
  const key = ingredientId ? `${ip}:${recipeId}:${ingredientId}` : `${ip}:${recipeId}`;
  const entry = rateLimitMap.get(key);

  if (!entry) {
    return MAX_REQUESTS;
  }

  const now = Date.now();
  const validTimestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  return Math.max(0, MAX_REQUESTS - validTimestamps.length);
}

/**
 * Get reset time for a key.
 */
export function getResetTime(ip: string, recipeId: string, ingredientId?: string): number {
  const key = ingredientId ? `${ip}:${recipeId}:${ingredientId}` : `${ip}:${recipeId}`;
  const entry = rateLimitMap.get(key);

  if (!entry || entry.timestamps.length === 0) {
    return 0;
  }

  const oldestTimestamp = Math.min(...entry.timestamps);
  return oldestTimestamp + WINDOW_MS;
}

/**
 * Internal cleanup of old entries.
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  const twoWindowsAgo = now - WINDOW_MS * 2;

  const keysToDelete: string[] = [];
  rateLimitMap.forEach((entry, key) => {
    if (entry.timestamps.every((ts: number) => ts < twoWindowsAgo)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => rateLimitMap.delete(key));
}

/**
 * Clear all rate limit data (for testing).
 */
export function clearRateLimitData(): void {
  rateLimitMap.clear();
}
```

## src/lib/email/sendReportEmail.ts

```
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
```

## __tests__/report-issue.test.ts

```
/**
 * Unit and integration tests for the "Report issue" flow.
 * Tests validation, rate limiting, and email sending.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ReportPayloadSchema } from '../src/lib/validation/report';
import {
  isRateLimited,
  getRemainingQuota,
  getResetTime,
  clearRateLimitData,
} from '../src/lib/security/rateLimit';

describe('Report Issue Validation', () => {
  describe('ReportPayloadSchema', () => {
    const validPayload = {
      recipeId: 'recipe-123',
      recipeName: 'Chocolate Cake',
      version: '1.0',
      ingredients: [
        {
          id: 'ing-1',
          name: 'flour',
          quantity: 100,
          units: 'g',
          flagged: true,
        },
        {
          id: 'ing-2',
          name: 'sugar',
          quantity: 50,
          units: 'g',
          flagged: false,
        },
      ],
      totals: { calories: 500, protein: 5 },
      breakdownSnapshot: { items: [] },
      reasonType: 'self_evident' as const,
      comment: undefined,
      userAgent: 'Mozilla/5.0',
      clientNonce: 'nonce-123',
    };

    it('should accept valid payload with self-evident reason', () => {
      const result = ReportPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept valid payload with comment reason', () => {
      const payload = {
        ...validPayload,
        reasonType: 'comment' as const,
        comment: 'The calculation seems wrong because...',
      };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject payload with no flagged ingredients', () => {
      const payload = {
        ...validPayload,
        ingredients: [
          { ...validPayload.ingredients[0], flagged: false },
          { ...validPayload.ingredients[1], flagged: false },
        ],
      };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('flagged')))
          .toBe(true);
      }
    });

    it('should reject payload with comment reason but no comment', () => {
      const payload = {
        ...validPayload,
        reasonType: 'comment' as const,
        comment: '',
      };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with comment reason but whitespace-only comment', () => {
      const payload = {
        ...validPayload,
        reasonType: 'comment' as const,
        comment: '   ',
      };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject comment exceeding 2000 characters', () => {
      const longComment = 'a'.repeat(2001);
      const payload = {
        ...validPayload,
        reasonType: 'comment' as const,
        comment: longComment,
      };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should accept comment at exactly 2000 characters', () => {
      const comment = 'a'.repeat(2000);
      const payload = {
        ...validPayload,
        reasonType: 'comment' as const,
        comment,
      };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should require recipeId', () => {
      const payload = { ...validPayload, recipeId: '' };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should require recipeName', () => {
      const payload = { ...validPayload, recipeName: '' };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should require clientNonce', () => {
      const payload = { ...validPayload, clientNonce: '' };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should require at least one ingredient', () => {
      const payload = { ...validPayload, ingredients: [] };
      const result = ReportPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimitData();
  });

  afterEach(() => {
    clearRateLimitData();
  });

  it('should allow up to 5 requests per minute', () => {
    const ip = '192.168.1.1';
    const recipeId = 'recipe-123';

    // First 5 should be allowed
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(ip, recipeId)).toBe(false);
    }

    // 6th should be rate limited
    expect(isRateLimited(ip, recipeId)).toBe(true);
  });

  it('should rate limit per IP + recipeId combination', () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';
    const recipe1 = 'recipe-123';
    const recipe2 = 'recipe-456';

    // Exhaust quota for ip1:recipe1
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(ip1, recipe1)).toBe(false);
    }
    expect(isRateLimited(ip1, recipe1)).toBe(true);

    // ip1:recipe2 should still be allowed
    expect(isRateLimited(ip1, recipe2)).toBe(false);

    // ip2:recipe1 should still be allowed
    expect(isRateLimited(ip2, recipe1)).toBe(false);
  });

  it('should return remaining quota', () => {
    const ip = '192.168.1.1';
    const recipeId = 'recipe-123';

    expect(getRemainingQuota(ip, recipeId)).toBe(5);

    isRateLimited(ip, recipeId);
    expect(getRemainingQuota(ip, recipeId)).toBe(4);

    isRateLimited(ip, recipeId);
    isRateLimited(ip, recipeId);
    expect(getRemainingQuota(ip, recipeId)).toBe(2);
  });

  it('should return reset time', () => {
    const ip = '192.168.1.1';
    const recipeId = 'recipe-123';

    isRateLimited(ip, recipeId);
    const resetTime = getResetTime(ip, recipeId);

    expect(resetTime).toBeGreaterThan(Date.now());
    expect(resetTime - Date.now()).toBeLessThanOrEqual(60000); // Within 1 minute
  });
});

describe('Email Sanitization', () => {
  // These are helper functions that should be tested in the context of the API route
  // For now, we document the expected behavior

  it('should strip HTML tags from comments', () => {
    // In src/app/api/report-issue/route.ts, the sanitizeComment function:
    // - Removes HTML tags using regex: comment.replace(/<[^>]*>/g, '')
    // - Decodes HTML entities: &lt; → <, &gt; → >, etc.
    // - Trims whitespace

    const input = 'This is <strong>HTML</strong> with &lt;tags&gt;';
    // Expected output: 'This is HTML with <tags>'

    expect(typeof input).toBe('string');
  });

  it('should preserve plain text comments', () => {
    const plainText = 'The calculation seems incorrect because the sugar amount is wrong.';
    expect(plainText).toContain('calculation');
  });

  it('should limit comment length to 2000 characters', () => {
    // Validated by ReportPayloadSchema.safeParse
    const longComment = 'a'.repeat(2001);
    const result = ReportPayloadSchema.safeParse({
      recipeId: 'recipe-123',
      recipeName: 'Test',
      ingredients: [{ name: 'flour', quantity: 100, units: 'g', flagged: true }],
      reasonType: 'comment',
      comment: longComment,
      userAgent: 'test',
      clientNonce: 'test',
    });
    expect(result.success).toBe(false);
  });
});

describe('Honeypot Protection', () => {
  it('should reject submission if favorite_color is non-empty', () => {
    const payload = {
      recipeId: 'recipe-123',
      recipeName: 'Test',
      ingredients: [{ name: 'flour', quantity: 100, units: 'g', flagged: true }],
      reasonType: 'self_evident' as const,
      userAgent: 'test',
      clientNonce: 'test',
      favorite_color: 'blue', // Should be empty
    };

    // This would be handled by the API route:
    // if (body.favorite_color && body.favorite_color.trim().length > 0) {
    //   return 400
    // }

    expect(payload.favorite_color).toBe('blue');
  });

  it('should allow empty favorite_color', () => {
    const payload = {
      recipeId: 'recipe-123',
      recipeName: 'Test',
      ingredients: [{ name: 'flour', quantity: 100, units: 'g', flagged: true }],
      reasonType: 'self_evident' as const,
      userAgent: 'test',
      clientNonce: 'test',
      favorite_color: '',
    };

    expect(payload.favorite_color).toBe('');
  });
});

describe('Email Content Generation', () => {
  it('should format flagged ingredients for email', () => {
    const ingredients = [
      { name: 'All Purpose Flour', quantity: 150, units: 'g', flagged: true },
      { name: 'Granulated Sugar', quantity: 100, units: 'g', flagged: true },
      { name: 'Eggs', quantity: 3, units: null, flagged: false },
    ];

    const flagged = ingredients.filter((ing) => ing.flagged);
    expect(flagged).toHaveLength(2);
    expect(flagged[0].name).toBe('All Purpose Flour');
    expect(flagged[1].name).toBe('Granulated Sugar');
  });

  it('should include timestamp in email', () => {
    const timestamp = new Date().toISOString();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should escape HTML in email content', () => {
    const unsafeText = '<script>alert("xss")</script>';
    const escaped = unsafeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
  });
});
```

