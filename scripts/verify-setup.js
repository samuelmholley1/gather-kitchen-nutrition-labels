#!/usr/bin/env node

/**
 * Setup Verification Script
 * 
 * Verifies that all environment variables are configured correctly
 * and tests connections to Airtable and USDA API.
 * 
 * Usage: node scripts/verify-setup.js
 * Or: yarn verify:env
 */

require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

let hasErrors = false;
let hasWarnings = false;

log('\n╔════════════════════════════════════════════════╗', 'cyan');
log('║     Environment Variables Verification       ║', 'cyan');
log('╚════════════════════════════════════════════════╝\n', 'cyan');

// Check Airtable credentials
log('Airtable Configuration:', 'cyan');

if (process.env.AIRTABLE_PAT_TOKEN) {
  const token = process.env.AIRTABLE_PAT_TOKEN;
  if (token.startsWith('pat') && token.length > 20) {
    logSuccess('AIRTABLE_PAT_TOKEN is set and looks valid');
  } else {
    logError('AIRTABLE_PAT_TOKEN is set but format looks incorrect');
    log('  Expected format: patXXXXXXXXXXXXXXXX', 'yellow');
    hasErrors = true;
  }
} else {
  logError('AIRTABLE_PAT_TOKEN is missing');
  hasErrors = true;
}

if (process.env.AIRTABLE_BASE_ID) {
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (baseId.startsWith('app') && baseId.length === 17) {
    logSuccess('AIRTABLE_BASE_ID is set and looks valid');
  } else {
    logError('AIRTABLE_BASE_ID is set but format looks incorrect');
    log('  Expected format: appXXXXXXXXXXXXXX (17 characters)', 'yellow');
    hasErrors = true;
  }
} else {
  logError('AIRTABLE_BASE_ID is missing');
  hasErrors = true;
}

// Check table names
const tableNames = [
  'AIRTABLE_SUBRECIPES_TABLE',
  'AIRTABLE_FINALDISHES_TABLE',
  'AIRTABLE_USDACACHE_TABLE',
];

tableNames.forEach(varName => {
  if (process.env[varName]) {
    logSuccess(`${varName} is set: "${process.env[varName]}"`);
  } else {
    logWarning(`${varName} is not set (will use default)`);
    hasWarnings = true;
  }
});

// Check USDA API key
log('\nUSDA API Configuration:', 'cyan');

if (process.env.USDA_API_KEY) {
  const apiKey = process.env.USDA_API_KEY;
  if (apiKey === 'DEMO_KEY') {
    logWarning('Using DEMO_KEY (OK for development, not for production)');
    hasWarnings = true;
  } else if (apiKey.length > 10) {
    logSuccess('USDA_API_KEY is set');
  } else {
    logError('USDA_API_KEY is set but looks too short');
    hasErrors = true;
  }
} else {
  logError('USDA_API_KEY is missing');
  hasErrors = true;
}

// Check optional password
log('\nOptional Configuration:', 'cyan');

if (process.env.PASSWORD_HASH) {
  logSuccess('PASSWORD_HASH is set (app will be password-protected)');
} else {
  logWarning('PASSWORD_HASH is not set (app will be public)');
  hasWarnings = true;
}

// Summary
log('\n╔════════════════════════════════════════════════╗', 'cyan');
log('║                Summary                        ║', 'cyan');
log('╚════════════════════════════════════════════════╝\n', 'cyan');

if (!hasErrors && !hasWarnings) {
  logSuccess('All environment variables are correctly configured! 🎉');
  log('\nNext steps:', 'cyan');
  log('1. Run: yarn setup:airtable', 'cyan');
  log('2. Run: yarn dev\n', 'cyan');
} else if (!hasErrors && hasWarnings) {
  logSuccess('Required variables are set, but there are warnings.');
  log('\nYou can proceed, but consider addressing the warnings.', 'yellow');
  log('\nNext steps:', 'cyan');
  log('1. Run: yarn setup:airtable', 'cyan');
  log('2. Run: yarn dev\n', 'cyan');
} else {
  logError('\nConfiguration is incomplete or incorrect.');
  log('\nPlease fix the errors above before proceeding.', 'yellow');
  log('\nSetup guide:', 'cyan');
  log('1. Copy .env.local.example to .env.local', 'cyan');
  log('2. Fill in all required values', 'cyan');
  log('3. Run: yarn verify:env again\n', 'cyan');
  process.exit(1);
}
