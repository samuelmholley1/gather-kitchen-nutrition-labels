#!/usr/bin/env node

/**
 * Airtable Setup Script
 * 
 * This script automatically creates the required Airtable tables and fields
 * via the Airtable Metadata API. Run this AFTER you have:
 * 1. Created an empty Airtable base
 * 2. Generated a Personal Access Token (PAT)
 * 3. Added credentials to .env.local
 * 
 * Usage: node scripts/setup-airtable.js
 * Or: yarn setup:airtable
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const PAT_TOKEN = process.env.AIRTABLE_PAT_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Table schemas matching AIRTABLE_NUTRITION_SETUP.md
const TABLE_SCHEMAS = {
  SubRecipes: {
    name: 'SubRecipes',
    description: 'Reusable recipe components (e.g., pizza dough, house aioli)',
    fields: [
      {
        name: 'Name',
        type: 'singleLineText',
        description: 'Sub-recipe name',
      },
      {
        name: 'IngredientsJSON',
        type: 'multilineText',
        description: 'Stringified JSON array of ingredients',
      },
      {
        name: 'NutrientProfileJSON',
        type: 'multilineText',
        description: 'Stringified JSON object of nutrient data per 100g',
      },
      {
        name: 'ServingSizeGrams',
        type: 'number',
        description: 'Default serving size in grams',
        options: {
          precision: 1,
        },
      },
      {
        name: 'RawTotalWeight',
        type: 'number',
        description: 'Auto-calculated sum of raw ingredients (grams)',
        options: {
          precision: 1,
        },
      },
      {
        name: 'FinalCookedWeight',
        type: 'number',
        description: 'User-entered weight after cooking (grams)',
        options: {
          precision: 1,
        },
      },
      {
        name: 'YieldPercentage',
        type: 'number',
        description: 'Auto-calculated: (Final / Raw) × 100',
        options: {
          precision: 0,
        },
      },
      {
        name: 'CookingMethod',
        type: 'singleSelect',
        description: 'Cooking method used',
        options: {
          choices: [
            { name: 'Raw', color: 'gray' },
            { name: 'Baked', color: 'orange' },
            { name: 'Roasted', color: 'red' },
            { name: 'Grilled', color: 'brown' },
            { name: 'Fried', color: 'yellow' },
            { name: 'Boiled', color: 'blue' },
            { name: 'Steamed', color: 'lightBlue' },
            { name: 'Sautéed', color: 'pink' },
            { name: 'Braised', color: 'purple' },
            { name: 'Stewed', color: 'green' },
            { name: 'Poached', color: 'teal' },
          ],
        },
      },
    ],
  },

  FinalDishes: {
    name: 'FinalDishes',
    description: 'Complete menu items built from USDA ingredients and/or SubRecipes',
    fields: [
      {
        name: 'Name',
        type: 'singleLineText',
        description: 'Final dish name',
      },
      {
        name: 'IngredientsJSON',
        type: 'multilineText',
        description: 'Stringified JSON array (includes SubRecipes)',
      },
      {
        name: 'NutrientProfileJSON',
        type: 'multilineText',
        description: 'Stringified JSON object of nutrient data per 100g',
      },
      {
        name: 'RawTotalWeight',
        type: 'number',
        description: 'Sum of all raw ingredient weights (grams)',
        options: {
          precision: 1,
        },
      },
      {
        name: 'FinalCookedWeight',
        type: 'number',
        description: 'Weight after cooking (grams)',
        options: {
          precision: 1,
        },
      },
      {
        name: 'YieldPercentage',
        type: 'number',
        description: '(Final / Raw) × 100',
        options: {
          precision: 0,
        },
      },
      {
        name: 'CookingMethod',
        type: 'singleSelect',
        description: 'Cooking method used',
        options: {
          choices: [
            { name: 'Raw', color: 'gray' },
            { name: 'Baked', color: 'orange' },
            { name: 'Roasted', color: 'red' },
            { name: 'Grilled', color: 'brown' },
            { name: 'Fried', color: 'yellow' },
            { name: 'Boiled', color: 'blue' },
            { name: 'Steamed', color: 'lightBlue' },
            { name: 'Sautéed', color: 'pink' },
            { name: 'Braised', color: 'purple' },
            { name: 'Stewed', color: 'green' },
            { name: 'Poached', color: 'teal' },
          ],
        },
      },
      {
        name: 'ServingsPerContainer',
        type: 'number',
        description: 'Optional: number of servings',
        options: {
          precision: 0,
        },
      },
      {
        name: 'ServingSizeGrams',
        type: 'number',
        description: 'Optional: serving size (grams)',
        options: {
          precision: 1,
        },
      },
      {
        name: 'ServingSizeDescription',
        type: 'singleLineText',
        description: 'Optional: e.g., "1 cup (240g)"',
      },
    ],
  },

  USDACache: {
    name: 'USDACache',
    description: 'Cached USDA FoodData Central API results',
    fields: [
      {
        name: 'FdcId',
        type: 'number',
        description: 'USDA FoodData Central unique ID',
        options: {
          precision: 0,
        },
      },
      {
        name: 'Name',
        type: 'singleLineText',
        description: 'Food description',
      },
      {
        name: 'DataType',
        type: 'singleSelect',
        description: 'USDA data type',
        options: {
          choices: [
            { name: 'Foundation', color: 'green' },
            { name: 'SR Legacy', color: 'blue' },
            { name: 'Survey (FNDDS)', color: 'yellow' },
            { name: 'Branded', color: 'gray' },
          ],
        },
      },
      {
        name: 'NutrientProfileJSON',
        type: 'multilineText',
        description: 'Stringified nutrient data per 100g',
      },
      {
        name: 'FoodPortionsJSON',
        type: 'multilineText',
        description: 'Stringified USDA portion data for conversions',
      },
      {
        name: 'CustomConversionJSON',
        type: 'multilineText',
        description: 'User-defined unit conversions (Risk Mitigation #1)',
      },
      {
        name: 'BrandOwner',
        type: 'singleLineText',
        description: 'For branded foods (optional)',
      },
      {
        name: 'BrandName',
        type: 'singleLineText',
        description: 'For branded foods (optional)',
      },
    ],
  },
};

// Make HTTPS request helper
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${PAT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.error?.message || body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Create a table
async function createTable(schema) {
  logInfo(`Creating table: ${schema.name}...`);
  
  try {
    const response = await makeRequest(
      'POST',
      `/v0/meta/bases/${BASE_ID}/tables`,
      {
        name: schema.name,
        description: schema.description,
        fields: schema.fields,
      }
    );

    logSuccess(`Created table: ${schema.name} (ID: ${response.id})`);
    return response;
  } catch (error) {
    if (error.message.includes('DUPLICATE_TABLE_NAME')) {
      logWarning(`Table ${schema.name} already exists, skipping...`);
      return null;
    }
    throw error;
  }
}

// Verify credentials
function verifyCredentials() {
  if (!PAT_TOKEN) {
    logError('AIRTABLE_PAT_TOKEN not found in .env.local');
    log('\nPlease add your Personal Access Token to .env.local:', 'yellow');
    log('AIRTABLE_PAT_TOKEN=patXXXXXXXXXXXXXXXX\n', 'yellow');
    process.exit(1);
  }

  if (!BASE_ID) {
    logError('AIRTABLE_BASE_ID not found in .env.local');
    log('\nPlease add your Base ID to .env.local:', 'yellow');
    log('AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX\n', 'yellow');
    process.exit(1);
  }

  logSuccess('Credentials found');
}

// Main setup function
async function setup() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║   Airtable Nutrition App - Automated Setup   ║', 'cyan');
  log('╚════════════════════════════════════════════════╝\n', 'cyan');

  // Step 1: Verify credentials
  log('Step 1: Verifying credentials...', 'blue');
  verifyCredentials();

  // Step 2: Test connection
  log('\nStep 2: Testing Airtable connection...', 'blue');
  try {
    const baseInfo = await makeRequest('GET', `/v0/meta/bases/${BASE_ID}/tables`);
    logSuccess(`Connected to base with ${baseInfo.tables.length} existing table(s)`);
  } catch (error) {
    logError(`Failed to connect: ${error.message}`);
    log('\nPlease verify:', 'yellow');
    log('1. Base ID is correct', 'yellow');
    log('2. PAT token has correct scopes (schema.bases:read, schema.bases:write)', 'yellow');
    log('3. PAT token has access to this base\n', 'yellow');
    process.exit(1);
  }

  // Step 3: Create tables
  log('\nStep 3: Creating tables...', 'blue');
  const createdTables = [];

  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    try {
      const table = await createTable(schema);
      if (table) {
        createdTables.push(table);
      }
    } catch (error) {
      logError(`Failed to create table ${tableName}: ${error.message}`);
      log('\nSetup incomplete. Please check the error above.\n', 'red');
      process.exit(1);
    }
  }

  // Step 4: Verify setup
  log('\nStep 4: Verifying setup...', 'blue');
  try {
    const baseInfo = await makeRequest('GET', `/v0/meta/bases/${BASE_ID}/tables`);
    const tableNames = baseInfo.tables.map(t => t.name);
    
    const requiredTables = ['SubRecipes', 'FinalDishes', 'USDACache'];
    const missingTables = requiredTables.filter(name => !tableNames.includes(name));

    if (missingTables.length === 0) {
      logSuccess('All required tables verified!');
    } else {
      logWarning(`Missing tables: ${missingTables.join(', ')}`);
    }

    log('\nBase Tables:', 'cyan');
    baseInfo.tables.forEach(table => {
      const emoji = requiredTables.includes(table.name) ? '✓' : '○';
      log(`  ${emoji} ${table.name} (${table.fields.length} fields)`, 'cyan');
    });

  } catch (error) {
    logWarning(`Could not verify: ${error.message}`);
  }

  // Success!
  log('\n╔════════════════════════════════════════════════╗', 'green');
  log('║            Setup Complete! 🎉                 ║', 'green');
  log('╚════════════════════════════════════════════════╝\n', 'green');

  log('Next steps:', 'cyan');
  log('1. Verify tables in Airtable UI', 'cyan');
  log('2. Run: yarn dev', 'cyan');
  log('3. Test the application\n', 'cyan');
}

// Run setup
setup().catch((error) => {
  logError(`\nSetup failed: ${error.message}`);
  process.exit(1);
});
