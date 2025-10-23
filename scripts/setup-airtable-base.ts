/**
 * Automated Airtable Base Setup Script
 * 
 * Creates the Nutrition App base structure programmatically using Airtable's Web API.
 * Run this once to avoid manual table/field creation.
 * 
 * Prerequisites:
 * 1. Create a new empty base in Airtable web UI (just the base, no tables)
 * 2. Copy the base ID from the URL (e.g., appXXXXXXXXXXXXXX)
 * 3. Update AIRTABLE_BASE_ID in .env.local with the new base ID
 * 4. Ensure AIRTABLE_PAT_TOKEN is set in .env.local
 * 
 * Usage:
 *   yarn tsx scripts/setup-airtable-base.ts
 */

import 'dotenv/config'

const AIRTABLE_PAT_TOKEN = process.env.AIRTABLE_PAT_TOKEN!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

if (!AIRTABLE_PAT_TOKEN || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing required environment variables:')
  console.error('   AIRTABLE_PAT_TOKEN:', AIRTABLE_PAT_TOKEN ? '✅ Set' : '❌ Missing')
  console.error('   AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const API_BASE = 'https://api.airtable.com/v0/meta/bases'

interface FieldConfig {
  name: string
  type: string
  options?: Record<string, any>
  description?: string
}

interface TableConfig {
  name: string
  description: string
  fields: FieldConfig[]
}

/**
 * Table schemas matching AIRTABLE_NUTRITION_SETUP.md
 */
const TABLES: TableConfig[] = [
  {
    name: 'SubRecipes',
    description: 'Component recipes (e.g., bechamel sauce, pie crust) with their ingredients and calculated nutrition',
    fields: [
      { name: 'Name', type: 'singleLineText', description: 'Sub-recipe name' },
      { name: 'Ingredients', type: 'multilineText', description: 'JSON array of ingredients with USDA data' },
      { name: 'TotalWeight', type: 'number', options: { precision: 2 }, description: 'Final weight in grams after cooking' },
      { name: 'YieldMultiplier', type: 'number', options: { precision: 3 }, description: 'Cooking yield (e.g., 0.75 for 25% moisture loss)' },
      { name: 'NutritionProfile', type: 'multilineText', description: 'JSON object with calculated nutrients per 100g' },
      { name: 'CustomConversions', type: 'multilineText', description: 'JSON object for ingredient-specific unit conversions' },
      { name: 'Notes', type: 'multilineText', description: 'Cooking instructions, yield notes' },
      { name: 'CreatedAt', type: 'dateTime', description: 'Record creation timestamp' },
      { name: 'UpdatedAt', type: 'dateTime', description: 'Last modification timestamp' },
      { name: 'Version', type: 'number', options: { precision: 0 }, description: 'Version number for tracking changes' },
    ],
  },
  {
    name: 'FinalDishes',
    description: 'Complete dishes (e.g., lasagna, apple pie) composed of sub-recipes with serving size information',
    fields: [
      { name: 'Name', type: 'singleLineText', description: 'Dish name for nutrition label' },
      { name: 'Components', type: 'multilineText', description: 'JSON array of sub-recipes and standalone ingredients' },
      { name: 'TotalWeight', type: 'number', options: { precision: 2 }, description: 'Final dish weight in grams' },
      { name: 'ServingSize', type: 'number', options: { precision: 2 }, description: 'Single serving size in grams' },
      { name: 'ServingsPerContainer', type: 'number', options: { precision: 1 }, description: 'Total servings in dish' },
      { name: 'NutritionLabel', type: 'multilineText', description: 'FDA-formatted nutrition label (JSON)' },
      { name: 'SubRecipeLinks', type: 'multipleRecordLinks', options: { linkedTableId: 'SubRecipes' }, description: 'Links to SubRecipes table' },
      { name: 'Allergens', type: 'multipleSelects', options: { choices: [
        { name: 'Milk' },
        { name: 'Eggs' },
        { name: 'Fish' },
        { name: 'Shellfish' },
        { name: 'Tree Nuts' },
        { name: 'Peanuts' },
        { name: 'Wheat' },
        { name: 'Soybeans' },
        { name: 'Sesame' },
      ]}, description: 'FDA major allergens' },
      { name: 'Notes', type: 'multilineText', description: 'Recipe notes, special instructions' },
      { name: 'CreatedAt', type: 'dateTime', description: 'Record creation timestamp' },
      { name: 'UpdatedAt', type: 'dateTime', description: 'Last modification timestamp' },
      { name: 'Status', type: 'singleSelect', options: { choices: [
        { name: 'Draft' },
        { name: 'Active' },
        { name: 'Archived' },
      ]}, description: 'Dish status for filtering' },
    ],
  },
  {
    name: 'USDACache',
    description: 'Cached USDA FoodData Central API responses to minimize API calls and improve performance',
    fields: [
      { name: 'FdcId', type: 'number', options: { precision: 0 }, description: 'USDA FoodData Central ID' },
      { name: 'Description', type: 'singleLineText', description: 'Food description from USDA' },
      { name: 'FoodData', type: 'multilineText', description: 'Full JSON response from USDA API' },
      { name: 'DataType', type: 'singleSelect', options: { choices: [
        { name: 'Foundation' },
        { name: 'SR Legacy' },
        { name: 'Survey (FNDDS)' },
        { name: 'Branded' },
      ]}, description: 'USDA data type' },
      { name: 'BrandOwner', type: 'singleLineText', description: 'Brand name for branded foods' },
      { name: 'Portions', type: 'multilineText', description: 'JSON array of available portion sizes' },
      { name: 'CachedAt', type: 'dateTime', description: 'When this record was cached' },
      { name: 'HitCount', type: 'number', options: { precision: 0 }, description: 'Number of times this food was used' },
      { name: 'LastUsed', type: 'dateTime', description: 'Last time this food was referenced' },
    ],
  },
]

/**
 * Create a table with all its fields
 */
async function createTable(baseId: string, tableConfig: TableConfig): Promise<void> {
  console.log(`\n📋 Creating table: ${tableConfig.name}`)
  console.log(`   Description: ${tableConfig.description}`)
  
  // Note: Airtable's REST API doesn't support creating tables directly
  // We need to use the Metadata API to create tables and fields
  const url = `${API_BASE}/${baseId}/tables`
  
  const payload = {
    name: tableConfig.name,
    description: tableConfig.description,
    fields: tableConfig.fields,
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_PAT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create table ${tableConfig.name}: ${response.status} ${error}`)
  }
  
  const result = await response.json()
  console.log(`   ✅ Created with ${tableConfig.fields.length} fields`)
  
  return result
}

/**
 * Check if a table already exists
 */
async function getBaseTables(baseId: string): Promise<any[]> {
  const url = `${API_BASE}/${baseId}/tables`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_PAT_TOKEN}`,
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get base tables: ${response.status} ${error}`)
  }
  
  const result = await response.json()
  return result.tables || []
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 Nutrition App - Airtable Base Setup')
  console.log('========================================\n')
  
  console.log('📊 Base ID:', AIRTABLE_BASE_ID)
  console.log('🔑 Token:', AIRTABLE_PAT_TOKEN.substring(0, 10) + '...')
  
  try {
    // Check existing tables
    console.log('\n🔍 Checking existing tables...')
    const existingTables = await getBaseTables(AIRTABLE_BASE_ID)
    console.log(`   Found ${existingTables.length} existing tables`)
    
    if (existingTables.length > 0) {
      console.log('\n⚠️  WARNING: Base already contains tables:')
      existingTables.forEach((t: any) => console.log(`   - ${t.name}`))
      console.log('\nThis script will only create missing tables.')
    }
    
    // Create each table
    for (const tableConfig of TABLES) {
      const exists = existingTables.find((t: any) => t.name === tableConfig.name)
      
      if (exists) {
        console.log(`\n⏭️  Skipping ${tableConfig.name} (already exists)`)
        continue
      }
      
      await createTable(AIRTABLE_BASE_ID, tableConfig)
      
      // Rate limiting: wait 1 second between table creations
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('\n✅ Base setup complete!')
    console.log('\n📝 Next Steps:')
    console.log('   1. Open your Airtable base to verify the tables')
    console.log('   2. The SubRecipeLinks field in FinalDishes should auto-link to SubRecipes')
    console.log('   3. Start building your nutrition calculator!')
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

main()
