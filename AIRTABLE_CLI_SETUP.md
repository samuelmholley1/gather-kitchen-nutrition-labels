# Automated Airtable Base Setup

This document explains how to set up your Nutrition App Airtable base **automatically** using our TypeScript setup script - no manual clicking required!

## Overview

Instead of manually creating tables and fields in Airtable's web UI, we'll use Airtable's REST API to create everything programmatically.

## Prerequisites

1. **Create Empty Base** (only manual step):
   - Go to https://airtable.com
   - Click "Add a base" → "Start from scratch"
   - Name it: `Nutrition App`
   - **Do NOT create any tables** - the script will do this

2. **Get Base ID**:
   - Open your new base
   - Copy the base ID from the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
   - The part starting with `app` is your Base ID

3. **Update .env.local**:
   ```bash
   # Replace the old liturgist base ID with your new nutrition base ID
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   ```

## Installation

We need to install `tsx` to run TypeScript files directly:

```bash
yarn add -D tsx dotenv
```

## Usage

Run the setup script:

```bash
yarn tsx scripts/setup-airtable-base.ts
```

## What the Script Creates

The script automatically creates **3 tables** with all fields:

### 1. SubRecipes Table (10 fields)
- Name (Single line text)
- Ingredients (Long text / JSON)
- TotalWeight (Number, 2 decimals)
- YieldMultiplier (Number, 3 decimals)
- NutritionProfile (Long text / JSON)
- CustomConversions (Long text / JSON)
- Notes (Long text)
- CreatedAt (Date/time)
- UpdatedAt (Date/time)
- Version (Number, integer)

### 2. FinalDishes Table (12 fields)
- Name (Single line text)
- Components (Long text / JSON)
- TotalWeight (Number, 2 decimals)
- ServingSize (Number, 2 decimals)
- ServingsPerContainer (Number, 1 decimal)
- NutritionLabel (Long text / JSON)
- SubRecipeLinks (Linked to SubRecipes table)
- Allergens (Multiple select: Milk, Eggs, Fish, etc.)
- Notes (Long text)
- CreatedAt (Date/time)
- UpdatedAt (Date/time)
- Status (Single select: Draft, Active, Archived)

### 3. USDACache Table (9 fields)
- FdcId (Number, integer)
- Description (Single line text)
- FoodData (Long text / JSON)
- DataType (Single select: Foundation, SR Legacy, etc.)
- BrandOwner (Single line text)
- Portions (Long text / JSON)
- CachedAt (Date/time)
- HitCount (Number, integer)
- LastUsed (Date/time)

## Expected Output

```
🚀 Nutrition App - Airtable Base Setup
========================================

📊 Base ID: appXXXXXXXXXXXXXX
🔑 Token: patXXXXXXX...

🔍 Checking existing tables...
   Found 0 existing tables

📋 Creating table: SubRecipes
   Description: Component recipes (e.g., bechamel sauce, pie crust)...
   ✅ Created with 10 fields

📋 Creating table: FinalDishes
   Description: Complete dishes (e.g., lasagna, apple pie)...
   ✅ Created with 12 fields

📋 Creating table: USDACache
   Description: Cached USDA FoodData Central API responses...
   ✅ Created with 9 fields

✅ Base setup complete!

📝 Next Steps:
   1. Open your Airtable base to verify the tables
   2. The SubRecipeLinks field in FinalDishes should auto-link to SubRecipes
   3. Start building your nutrition calculator!
```

## Troubleshooting

### Error: "Missing required environment variables"
- Ensure `.env.local` contains both `AIRTABLE_PAT_TOKEN` and `AIRTABLE_BASE_ID`
- Verify the base ID starts with `app`

### Error: "Failed to create table"
- Check that your Personal Access Token has "schema.bases:write" scope
- Ensure the base is empty (or script will skip existing tables)

### Script runs but tables not visible
- Refresh your Airtable browser tab
- Check you're looking at the correct base (verify URL matches your Base ID)

## Alternative: Manual Setup

If you prefer to create tables manually, see `AIRTABLE_NUTRITION_SETUP.md` for detailed field-by-field instructions.

## Technical Details

The script uses:
- **Airtable Metadata API**: https://airtable.com/developers/web/api/create-table
- **REST API**: Creates tables and fields with proper types
- **Rate Limiting**: 1-second delay between table creations
- **Idempotency**: Skips tables that already exist

## Security

- Never commit `.env.local` to version control
- Your Personal Access Token has full access to all your bases
- Rotate tokens periodically for security
