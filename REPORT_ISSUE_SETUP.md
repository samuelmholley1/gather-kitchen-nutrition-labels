# Report Issue Feature - Environment Setup

This document describes how to set up the "Report issue" feature for the nutrition label calculator.

## Overview

The "Report issue" feature allows users to flag problematic ingredients and submit detailed reports about nutrition calculation errors. Reports are automatically emailed to the support team via Zoho SMTP.

## Prerequisites

1. **Zoho Mail Account**: An active Zoho mail account with an app-specific password generated
2. **Node.js 18+**: Required for the application
3. **Next.js 14.2.5+**: App Router configuration

## Environment Variables

Add the following variables to your `.env.local` file:

```env
```env
# Zoho SMTP Configuration
ZOHO_USER=alerts@samuelholley.com
ZOHO_APP_PASSWORD=YOUR_ZOHO_APP_PASSWORD_HERE
ZOHO_HOST=smtp.zoho.com
ZOHO_PORT=465
ZOHO_SECURE=true

# Report Email Recipients (comma-separated)
REPORT_TO="sam@samuelholley.com,info@gather.kitchen"
```
```

### Zoho SMTP Setup

To generate an app-specific password for Zoho:

1. Log in to your Zoho account at https://mail.zoho.com
2. Navigate to Settings → Security
3. Look for "App Passwords" or "Connected Apps"
4. Generate a new app password for "Nodemailer SMTP"
5. Copy the generated password to `ZOHO_APP_PASSWORD`

## Dependencies

The following npm packages are required:

```
zod@^4.1.12              - Schema validation
nodemailer@^7.0.10       - SMTP email sending
@types/nodemailer@^7.0.3 - TypeScript types for nodemailer
```

Install with:
```bash
yarn add zod nodemailer
yarn add -D @types/nodemailer
```

## Feature Components

### 1. API Route: `/api/report-issue`

**Path**: `src/app/api/report-issue/route.ts`

- **Method**: POST
- **Rate Limit**: 5 reports per minute per IP + recipeId
- **Validation**: Zod schema with comprehensive checks
- **Authentication**: None required (rate limiting provides protection)
- **Returns**: 
  - `201 { reportId, timestamp, flaggedCount }` on success
  - `429 { error, retryAfter }` on rate limit
  - `400 { error, fieldErrors }` on validation error
  - `500 { error, code }` on server error

### 2. Email Utility: `/lib/email/sendReportEmail.ts`

Handles Zoho SMTP email sending with:
- Auto-connect and transport initialization
- HTML and plain text email bodies
- Error handling and logging
- Connection verification

### 3. Rate Limiter: `/lib/security/rateLimit.ts`

In-memory rate limiting with:
- 5 requests per minute per IP + recipeId
- Automatic cleanup of old entries
- Quota tracking and reset time calculation

**Note**: For production with multiple server instances, replace with Redis-based rate limiting (TODO comment included).

### 4. UI Components

#### ReportIssueModal.tsx
Modal dialog featuring:
- Read-only calculation breakdown display
- Per-ingredient checkbox flagging
- Reason selection (self-evident or custom comment)
- 2000-character comment limit
- Honeypot protection
- Keyboard navigation (Esc to close)
- Focus management

#### ReportIssueButton.tsx
Trigger button that:
- Opens the ReportIssueModal
- Handles modal state
- Calls report submission handler

### 5. Types & Validation

#### `/lib/types/report.ts`
TypeScript interfaces:
- `ReportPayload`: Complete report structure
- `FlaggedIngredient`: Per-ingredient flag data
- `ReasonType`: "self_evident" | "comment"
- `BreakdownSnapshot`: Calculation provenance data

#### `/lib/validation/report.ts`
Zod schemas:
- `ReportPayloadSchema`: Main validation with cross-field checks
- Validates flagged ingredient requirement
- Enforces comment requirement for "comment" reason
- Limits comment length to 2000 characters

## Integration

The ReportIssueButton is integrated into `src/app/final-dishes/page.tsx`:

```tsx
import { ReportIssueButton } from '@/components/ReportIssueButton'

// In the nutrition label modal:
<ReportIssueButton
  recipeId={viewingLabel.id}
  recipeName={viewingLabel.name}
  ingredients={viewingLabel.components}
  totals={viewingLabel.nutritionLabel}
  breakdownSnapshot={provenanceData}
/>
```

## Email Format

Reports are sent in both HTML and plain text formats with:

1. **Header**: Timestamp, recipe info, reason, flagged count
2. **Flagged Ingredients**: Table with name, quantity, units
3. **Calculated Totals**: Summary of nutrition values
4. **User Comment**: If provided (sanitized plain text)
5. **Breakdown JSON**: Collapsible details section

**From**: `alerts@samuelholley.com` (or ZOHO_USER env var)
**To**: Recipients in REPORT_TO env var
**Subject**: `[Nutrition Label Report] {recipeName} ({recipeId}) – {count} flagged`

## Security Features

1. **Honeypot Protection**: Hidden "favorite_color" field must remain empty
2. **Input Validation**: Strict Zod schema validation
3. **HTML Sanitization**: Comment text stripped of HTML tags
4. **Rate Limiting**: 5/min per IP + recipeId prevents spam
5. **Environment Secrets**: SMTP credentials only in .env.local
6. **CORS & Authentication**: Private route, no external access

## Testing

Unit tests are in `__tests__/report-issue.test.ts`:

```bash
yarn test
```

Tests cover:
- Payload validation (flagged ingredients, comment requirements, length limits)
- Rate limiting (quota, reset time, per-key isolation)
- Email sanitization (HTML stripping, character limits)
- Honeypot protection

## Troubleshooting

### Emails Not Sending

1. **Check Zoho credentials**: Verify ZOHO_USER and ZOHO_APP_PASSWORD in .env.local
2. **Check REPORT_TO**: Ensure comma-separated email addresses are valid
3. **Check network**: Ensure SMTP port 465 is not blocked by firewall
4. **Check logs**: Review server logs for "Failed to send report email" messages

### Rate Limiting Issues

For development, reduce the rate limit in `src/lib/security/rateLimit.ts`:
```ts
const MAX_REQUESTS = 5;  // Change to 100 for testing
const WINDOW_MS = 60 * 1000;  // 1 minute window
```

### Modal Not Appearing

1. Verify ReportIssueButton is imported in the page component
2. Check browser console for JavaScript errors
3. Ensure ingredients array is not empty

## Production Deployment

Before deploying to production:

1. ✅ Set ZOHO_USER and ZOHO_APP_PASSWORD in production environment
2. ✅ Set REPORT_TO with production support email addresses
3. ✅ Test SMTP connection with `sendReportEmail.verifySmtpConnection()`
4. ✅ Replace in-memory rate limiter with Redis (see TODO in rateLimit.ts)
5. ✅ Monitor email delivery and handle bounce-back addresses
6. ✅ Enable monitoring/alerting for failed submissions

## Future Enhancements

- [ ] Persist reports to database for admin dashboard
- [ ] Add report status tracking (submitted, reviewed, resolved)
- [ ] Create admin UI to view and respond to reports
- [ ] Add email threading for follow-up replies
- [ ] Implement Redis-based rate limiting for distributed deployments
- [ ] Add report analytics and trending issues
- [ ] Implement automated triage based on flagged ingredient patterns

## Support

For issues or questions about the Report Issue feature:
- Check logs in `/server-logs.txt` or console output
- Review error details in the modal response
- Contact: support@gather.kitchen
