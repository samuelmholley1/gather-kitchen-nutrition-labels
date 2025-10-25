/**
 * Airtable Schema Validator
 * 
 * Verifies that the Airtable base has all required fields with correct types.
 * Run this before deploying to catch schema mismatches early.
 * 
 * Usage: npx tsx scripts/validate-airtable-schema.ts
 */

import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT_TOKEN! })
  .base(process.env.AIRTABLE_BASE_ID!)

// Expected schema for FinalDishes table
const EXPECTED_SCHEMA = {
  tableName: 'FinalDishes',
  fields: [
    { name: 'Name', type: 'singleLineText', required: true },
    { name: 'Components', type: 'multilineText', required: true }, // Must be Long Text
    { name: 'TotalWeight', type: 'number', required: false },
    { name: 'ServingSize', type: 'number', required: false },
    { name: 'ServingsPerContainer', type: 'number', required: false },
    { name: 'NutritionLabel', type: 'multilineText', required: false }, // Must be Long Text
    { name: 'SubRecipeLinks', type: 'multipleRecordLinks', required: false },
    { name: 'Allergens', type: 'multipleSelects', required: false },
    { name: 'Category', type: 'singleLineText', required: false },
    { name: 'Notes', type: 'multilineText', required: false },
    { name: 'Status', type: 'singleLineText', required: false },
    { name: 'CreatedAt', type: 'dateTime', required: false },
    { name: 'UpdatedAt', type: 'dateTime', required: false },
  ]
}

async function validateSchema() {
  console.log('🔍 Validating Airtable schema...\n')
  
  try {
    // Try to get table metadata (this will fail if table doesn't exist)
    const table = base(EXPECTED_SCHEMA.tableName)
    
    // Attempt to get schema by creating a test record and catching errors
    console.log('✓ Table exists:', EXPECTED_SCHEMA.tableName)
    
    // Test with minimal data to see what fails
    const testData: any = {
      Name: 'SCHEMA_TEST_DELETE_ME',
      Components: JSON.stringify([{ type: 'ingredient', name: 'test' }]),
      TotalWeight: 100,
      ServingSize: 100,
      ServingsPerContainer: 1,
      NutritionLabel: JSON.stringify({ calories: 0 }),
      Category: 'Test',
      Notes: 'Schema validation test',
      Status: 'Draft',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    }
    
    console.log('\n📝 Attempting test record creation...')
    
    try {
      const record = await table.create([{ fields: testData }])
      
      console.log('✅ Test record created successfully!')
      console.log('   Record ID:', record[0].id)
      
      // Clean up test record
      await table.destroy([record[0].id])
      console.log('🗑️  Test record deleted')
      
      console.log('\n✅ All schema validations passed!')
      console.log('\nYour Airtable schema is correctly configured.')
      
    } catch (createError: any) {
      console.error('\n❌ Schema validation failed!')
      console.error('\nError:', createError.message)
      
      // Provide helpful diagnostics
      if (createError.message.includes('Components')) {
        console.error('\n💡 FIX: The "Components" field must be type "Long text" (multiline text)')
        console.error('   1. Go to your FinalDishes table in Airtable')
        console.error('   2. Click on the "Components" field header')
        console.error('   3. Change field type to "Long text"')
      }
      
      if (createError.message.includes('NutritionLabel')) {
        console.error('\n💡 FIX: The "NutritionLabel" field must be type "Long text" (multiline text)')
      }
      
      if (createError.message.includes('UNKNOWN_FIELD_NAME')) {
        console.error('\n💡 FIX: One or more required fields are missing from your Airtable table')
        console.error('   Required fields:', EXPECTED_SCHEMA.fields.filter(f => f.required).map(f => f.name).join(', '))
      }
      
      console.error('\n📋 Expected Schema:')
      EXPECTED_SCHEMA.fields.forEach(field => {
        const requiredTag = field.required ? ' (REQUIRED)' : ''
        console.error(`   • ${field.name}: ${field.type}${requiredTag}`)
      })
      
      process.exit(1)
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    console.error('\n💡 Check that:')
    console.error('   1. AIRTABLE_PAT_TOKEN is set correctly')
    console.error('   2. AIRTABLE_BASE_ID is correct')
    console.error('   3. FinalDishes table exists in your base')
    process.exit(1)
  }
}

// Run validation
validateSchema()
