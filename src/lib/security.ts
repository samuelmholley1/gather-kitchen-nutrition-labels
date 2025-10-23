/**
 * Security Utilities
 * XSS protection and input sanitization
 */

/**
 * Sanitize text input to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate recipe text length to prevent DOS attacks
 */
export function validateRecipeTextLength(text: string): { valid: boolean; error?: string } {
  const MAX_LENGTH = 50000 // 50KB max
  const MAX_LINES = 500

  if (text.length > MAX_LENGTH) {
    return {
      valid: false,
      error: `Recipe text is too long (${text.length} characters). Maximum is ${MAX_LENGTH} characters.`
    }
  }

  const lines = text.split('\n')
  if (lines.length > MAX_LINES) {
    return {
      valid: false,
      error: `Recipe has too many lines (${lines.length}). Maximum is ${MAX_LINES} lines.`
    }
  }

  return { valid: true }
}

/**
 * Sanitize ingredient name for database storage
 */
export function sanitizeIngredientName(name: string): string {
  // Remove any SQL-injection-like patterns (Airtable handles this but good practice)
  return name
    .replace(/[^\w\s\-\(\),\.\/]/g, '') // Allow only safe characters
    .trim()
    .slice(0, 255) // Max length for ingredient names
}
