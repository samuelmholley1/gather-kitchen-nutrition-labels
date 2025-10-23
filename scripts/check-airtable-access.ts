/**
 * Simple Airtable Base Setup - Alternative Method
 * 
 * This script creates records with the correct field structure,
 * which will auto-create the fields in Airtable.
 * 
 * Run after creating an empty base with one default table.
 */

import Airtable from 'airtable'
import 'dotenv/config'

const AIRTABLE_PAT_TOKEN = process.env.AIRTABLE_PAT_TOKEN!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

console.log('🚀 Airtable Setup - Simple Method')
console.log('====================================\n')
console.log('📊 Base ID:', AIRTABLE_BASE_ID)

const airtable = new Airtable({ apiKey: AIRTABLE_PAT_TOKEN })
const base = airtable.base(AIRTABLE_BASE_ID)

async function setupBase() {
  try {
    console.log('\n📋 Step 1: Checking base access...')
    
    // List all tables in the base
    const tables = await fetch(`https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT_TOKEN}`
      }
    })
    
    if (tables.ok) {
      const data = await tables.json()
      console.log('✅ Base accessible!')
      console.log('   Existing tables:', data.tables?.map((t: any) => t.name).join(', ') || 'None')
      
      console.log('\n❌ PROBLEM: Your PAT token has data access but NOT schema access.')
      console.log('\n📝 SOLUTION: We need to create tables manually in Airtable UI.')
      console.log('\n🎯 NEXT STEPS:')
      console.log('   1. Open your Airtable base: https://airtable.com/' + AIRTABLE_BASE_ID)
      console.log('   2. Rename the default table to "SubRecipes"')
      console.log('   3. Click "Add or import" → "Add table" → Create "FinalDishes"')
      console.log('   4. Click "Add or import" → "Add table" → Create "USDACache"')
      console.log('\n   Then I\'ll help you add all the fields!')
      
    } else {
      const error = await tables.text()
      console.log('❌ Cannot access base:', error)
      console.log('\n🔧 Your PAT token needs these scopes:')
      console.log('   - data.records:read')
      console.log('   - data.records:write')
      console.log('   - schema.bases:read')
      console.log('   - schema.bases:write')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

setupBase()
