import Airtable from 'airtable'
import { requireValidEnvironment } from './validateEnv'

// Validate environment variables before initializing Airtable
if (typeof window === 'undefined') {
  // Only validate on server-side (API routes, not client)
  requireValidEnvironment()
}

// Initialize Airtable with PAT token
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_PAT_TOKEN || 'placeholder_for_build',
})

const base = airtable.base(process.env.AIRTABLE_BASE_ID || 'appPlaceholder')

export { base }
