/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at startup to prevent
 * silent failures in production. Throws detailed error if config is missing.
 */

const requiredEnvVars = [
  'AIRTABLE_PAT_TOKEN',
  'AIRTABLE_BASE_ID',
  'AIRTABLE_SUBRECIPES_TABLE',
  'AIRTABLE_FINALDISHES_TABLE',
  'AIRTABLE_USDACACHE_TABLE',
  'USDA_API_KEY',
] as const

const placeholderValues = [
  'placeholder_for_build',
  'appPlaceholder',
  'patXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'appXXXXXXXXXXXXXX',
  'your_usda_api_key_here',
  'DEMO_KEY',
]

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates all required environment variables
 * Returns detailed error messages if validation fails
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = []

  for (const varName of requiredEnvVars) {
    const value = process.env[varName]

    // Check if variable exists
    if (!value) {
      errors.push(`❌ ${varName} is not set`)
      continue
    }

    // Check if it's a placeholder value
    if (placeholderValues.some(placeholder => value.includes(placeholder))) {
      errors.push(`❌ ${varName} contains placeholder value: "${value}"`)
      continue
    }

    // Check minimum length for API keys/tokens only (table names can be short)
    const isApiKeyOrToken = varName.includes('TOKEN') || varName.includes('API_KEY') || varName.includes('BASE_ID')
    if (isApiKeyOrToken && value.length < 10) {
      errors.push(`❌ ${varName} is too short (${value.length} chars) - likely invalid`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates environment and throws if invalid (for API routes)
 * Use this in API routes to fail fast with clear error messages
 */
export function requireValidEnvironment(): void {
  const result = validateEnvironment()
  
  if (!result.isValid) {
    const errorMessage = [
      '🚨 ENVIRONMENT CONFIGURATION ERROR',
      '',
      'Missing or invalid environment variables:',
      ...result.errors,
      '',
      'Please check your .env.local file and ensure all variables are set correctly.',
      'See .env.local.example for reference.',
    ].join('\n')

    throw new Error(errorMessage)
  }
}

/**
 * Validates environment and logs warnings (for build time)
 * Use this during build to warn about issues without blocking the build
 */
export function warnInvalidEnvironment(): void {
  const result = validateEnvironment()
  
  if (!result.isValid) {
    console.warn('\n⚠️  ENVIRONMENT VALIDATION WARNING\n')
    console.warn('Some environment variables may be misconfigured:\n')
    result.errors.forEach(error => console.warn(`  ${error}`))
    console.warn('\n👉 This build will succeed, but the app may not work correctly.')
    console.warn('👉 Check your .env.local file and Vercel environment variables.\n')
  } else {
    console.log('✅ Environment variables validated successfully')
  }
}
