# Airtable Base Setup Guide - Nutrition App

**Base Name:** Nutrition App  
**Purpose:** Store sub-recipes, final dishes, and cached USDA ingredient data  
**Tables:** 3 (SubRecipes, FinalDishes, USDACache)  
**Last Updated:** October 22, 2025

---

## Quick Start Checklist

- [ ] Create new Airtable base named "Nutrition App"
- [ ] Create SubRecipes table with 10 fields
- [ ] Create FinalDishes table with 12 fields
- [ ] Create USDACache table with 8 fields
- [ ] Generate Personal Access Token (PAT)
- [ ] Get Base ID from URL
- [ ] Add credentials to `.env.local`
- [ ] Test connection

---

## Step 1: Create Airtable Base

1. Log into Airtable: https://airtable.com
2. Click "+ Create" or "Add a base"
3. Choose "Start from scratch"
4. Name: **Nutrition App**
5. Choose an icon and color (optional)
6. Click "Create base"

---

## Step 2: Create SubRecipes Table

The SubRecipes table stores reusable recipe components (e.g., "pizza dough", "house-made aioli").

### Rename Default Table

1. Click the table name "Table 1" (top left)
2. Rename to: **SubRecipes**
3. Press Enter

### Create Fields

Delete the default "Notes" field, then create these fields:

| # | Field Name | Field Type | Options/Description |
|---|------------|------------|---------------------|
| 1 | **Name** | Single line text | Recipe name (auto-created, rename from "Name") |
| 2 | **IngredientsJSON** | Long text | Stringified JSON array of ingredients |
| 3 | **NutrientProfileJSON** | Long text | Stringified JSON object of nutrient data |
| 4 | **ServingSizeGrams** | Number | Default serving size in grams |
| 5 | **RawTotalWeight** | Number | Auto-calculated sum of raw ingredients (grams) |
| 6 | **FinalCookedWeight** | Number | User-entered weight after cooking (grams) |
| 7 | **YieldPercentage** | Number | Auto-calculated: (Final / Raw) × 100 |
| 8 | **CookingMethod** | Single select | Options: Raw, Baked, Roasted, Grilled, Fried, Boiled, Steamed, Sautéed, Braised, Stewed, Poached |
| 9 | **CreatedAt** | Created time | Auto-generated timestamp |
| 10 | **UpdatedAt** | Last modified time | Auto-generated timestamp |

### Field Configuration Details

**IngredientsJSON:**
- Field type: Long text
- Enable rich text formatting: NO
- Example value:
  ```json
  [
    {
      "fdcId": 171477,
      "name": "Chicken breast",
      "quantity": 500,
      "unit": "g"
    },
    {
      "subRecipeId": "recABC123",
      "name": "House Aioli",
      "quantity": 50,
      "unit": "g"
    }
  ]
  ```

**NutrientProfileJSON:**
- Field type: Long text
- Enable rich text formatting: NO
- Example value:
  ```json
  {
    "calories": 165,
    "totalFat": 3.6,
    "saturatedFat": 1.0,
    "protein": 31.0,
    ...
  }
  ```

**ServingSizeGrams:**
- Field type: Number
- Precision: 1 decimal place
- Allow negative numbers: NO

**RawTotalWeight, FinalCookedWeight:**
- Field type: Number
- Precision: 1 decimal place
- Allow negative numbers: NO

**YieldPercentage:**
- Field type: Number
- Precision: 0 decimal places
- Allow negative numbers: NO

**CookingMethod:**
- Field type: Single select
- Options (add these colors for visual clarity):
  - Raw (Gray)
  - Baked (Orange)
  - Roasted (Red)
  - Grilled (Brown)
  - Fried (Yellow)
  - Boiled (Blue)
  - Steamed (Light Blue)
  - Sautéed (Pink)
  - Braised (Purple)
  - Stewed (Green)
  - Poached (Teal)

---

## Step 3: Create FinalDishes Table

The FinalDishes table stores complete menu items built from USDA ingredients and/or SubRecipes.

### Create New Table

1. Click "+" next to table tabs
2. Choose "Start from scratch"
3. Name: **FinalDishes**

### Create Fields

Delete the default "Notes" field, then create these fields:

| # | Field Name | Field Type | Options/Description |
|---|------------|------------|---------------------|
| 1 | **Name** | Single line text | Dish name (auto-created, rename) |
| 2 | **IngredientsJSON** | Long text | Stringified JSON array (includes SubRecipes) |
| 3 | **NutrientProfileJSON** | Long text | Stringified JSON object of nutrient data |
| 4 | **RawTotalWeight** | Number | Sum of all raw ingredient weights (grams) |
| 5 | **FinalCookedWeight** | Number | Weight after cooking (grams) |
| 6 | **YieldPercentage** | Number | (Final / Raw) × 100 |
| 7 | **CookingMethod** | Single select | Same options as SubRecipes |
| 8 | **ServingsPerContainer** | Number | Optional: number of servings |
| 9 | **ServingSizeGrams** | Number | Optional: serving size (grams) |
| 10 | **ServingSizeDescription** | Single line text | Optional: "1 cup (240g)" |
| 11 | **CreatedAt** | Created time | Auto-generated |
| 12 | **UpdatedAt** | Last modified time | Auto-generated |

### Field Configuration

Same as SubRecipes for shared fields. Additional fields:

**ServingsPerContainer:**
- Field type: Number
- Precision: 0 decimal places (whole servings)
- Allow negative numbers: NO

**ServingSizeDescription:**
- Field type: Single line text
- Example: "1 cup (240g)", "8 oz (227g)", "1 slice (50g)"

---

## Step 4: Create USDACache Table

The USDACache table stores USDA FoodData Central API results to minimize API calls and enable custom unit conversions.

### Create New Table

1. Click "+" next to table tabs
2. Choose "Start from scratch"
3. Name: **USDACache**

### Create Fields

Delete the default "Notes" field, then create these fields:

| # | Field Name | Field Type | Options/Description |
|---|------------|------------|---------------------|
| 1 | **FdcId** | Number | USDA FoodData Central unique ID (rename default "Name" field) |
| 2 | **Name** | Single line text | Food description |
| 3 | **DataType** | Single select | Foundation, SR Legacy, Survey (FNDDS), Branded |
| 4 | **NutrientProfileJSON** | Long text | Stringified nutrient data per 100g |
| 5 | **FoodPortionsJSON** | Long text | Stringified USDA portion data for conversions |
| 6 | **CustomConversionJSON** | Long text | User-defined unit conversions (Risk Mitigation #1) |
| 7 | **BrandOwner** | Single line text | For branded foods (optional) |
| 8 | **BrandName** | Single line text | For branded foods (optional) |
| 9 | **LastUpdated** | Last modified time | Auto-generated |

### Field Configuration

**FdcId:**
- Field type: Number
- Precision: 0 decimal places (whole numbers)
- Allow negative numbers: NO
- This should be the PRIMARY field (first column)

**DataType:**
- Field type: Single select
- Options:
  - Foundation (Green) - Best quality
  - SR Legacy (Blue) - Standard reference
  - Survey (FNDDS) (Yellow) - Survey data
  - Branded (Gray) - Commercial products

**NutrientProfileJSON:**
- Same as other tables
- Per 100g basis

**FoodPortionsJSON:**
- Field type: Long text
- Example:
  ```json
  [
    {
      "id": 123456,
      "amount": 1.0,
      "gramWeight": 140,
      "modifier": "chopped or diced",
      "measureUnit": {
        "id": 1005,
        "name": "cup",
        "abbreviation": "cup"
      }
    }
  ]
  ```

**CustomConversionJSON** (CRITICAL for Risk Mitigation #1):
- Field type: Long text
- User-defined conversions that override USDA and standard values
- Example:
  ```json
  {
    "cup": 120,
    "tbsp": 8,
    "tsp": 2.7
  }
  ```

---

## Step 5: Get Airtable Credentials

### Generate Personal Access Token (PAT)

1. Go to: https://airtable.com/create/tokens
2. Click "Create new token"
3. Name: **Nutrition App - Production**
4. Add scopes:
   - ✅ `data.records:read`
   - ✅ `data.records:write`
   - ✅ `schema.bases:read`
5. Add access to bases:
   - Select "Nutrition App" base
6. Click "Create token"
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again)
8. Store securely

### Get Base ID

1. Open the "Nutrition App" base
2. Look at the URL in browser:
   ```
   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
                        ^^^^^^^^^^^^^^^^^^
                        This is your Base ID
   ```
3. Copy the `appXXXXXXXXXXXXXX` portion

### Get Table IDs (Optional)

Not required for our implementation (we use table names), but good to document:

1. Open each table
2. Table ID is in URL: `tblYYYYYYYYYYYYYY`

---

## Step 6: Configure Environment Variables

1. Open `/Users/samuelholley/Projects/gather_kitchen_nutrition_labels/.env.local`
2. Add or update these variables:

```env
# Airtable Configuration
AIRTABLE_PAT_TOKEN=patXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Airtable Table Names (exact names from base)
AIRTABLE_SUBRECIPES_TABLE=SubRecipes
AIRTABLE_FINALDISHES_TABLE=FinalDishes
AIRTABLE_USDACACHE_TABLE=USDACache

# USDA FoodData Central API
USDA_API_KEY=your_usda_api_key_here

# Optional: Password Protection
PASSWORD_HASH=your_password_hash
```

3. Save the file
4. **DO NOT COMMIT** `.env.local` to Git (already in `.gitignore`)

---

## Step 7: Test Connection

### Option 1: Test via Application (after Phase 2 complete)

1. Start dev server: `yarn dev`
2. Navigate to sub-recipes page
3. Try creating a test recipe
4. Check Airtable to verify record created

### Option 2: Test via Airtable API Directly

Use this curl command (replace values):

```bash
curl "https://api.airtable.com/v0/YOUR_BASE_ID/SubRecipes" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [
      {
        "fields": {
          "Name": "Test Recipe",
          "IngredientsJSON": "[]",
          "NutrientProfileJSON": "{}",
          "ServingSizeGrams": 100,
          "RawTotalWeight": 100,
          "FinalCookedWeight": 100,
          "YieldPercentage": 100,
          "CookingMethod": "Raw"
        }
      }
    ]
  }'
```

If successful, you'll get a response with the created record.

---

## Data Examples

### Sample SubRecipe Record

**Name:** Pizza Dough

**IngredientsJSON:**
```json
[
  {
    "fdcId": 169761,
    "name": "All-purpose flour",
    "quantity": 500,
    "unit": "g"
  },
  {
    "fdcId": 171412,
    "name": "Water",
    "quantity": 300,
    "unit": "ml"
  },
  {
    "fdcId": 172587,
    "name": "Active dry yeast",
    "quantity": 7,
    "unit": "g"
  },
  {
    "fdcId": 171435,
    "name": "Salt",
    "quantity": 10,
    "unit": "g"
  },
  {
    "fdcId": 171413,
    "name": "Olive oil",
    "quantity": 30,
    "unit": "ml"
  }
]
```

**RawTotalWeight:** 847g  
**FinalCookedWeight:** 847g (raw dough, not baked yet)  
**YieldPercentage:** 100%  
**CookingMethod:** Raw  

### Sample FinalDish Record

**Name:** Margherita Pizza

**IngredientsJSON:**
```json
[
  {
    "subRecipeId": "recABC123DEF456",
    "name": "Pizza Dough",
    "quantity": 250,
    "unit": "g"
  },
  {
    "fdcId": 171287,
    "name": "Tomato sauce",
    "quantity": 100,
    "unit": "g"
  },
  {
    "fdcId": 173418,
    "name": "Mozzarella cheese",
    "quantity": 150,
    "unit": "g"
  },
  {
    "fdcId": 168421,
    "name": "Fresh basil",
    "quantity": 10,
    "unit": "g"
  }
]
```

**RawTotalWeight:** 510g  
**FinalCookedWeight:** 450g (water evaporation during baking)  
**YieldPercentage:** 88%  
**CookingMethod:** Baked  
**ServingsPerContainer:** 4  
**ServingSizeGrams:** 112.5 (450g ÷ 4)  
**ServingSizeDescription:** "1/4 pizza (113g)"  

### Sample USDACache Record

**FdcId:** 169761  
**Name:** Wheat flour, white, all-purpose, enriched, bleached  
**DataType:** SR Legacy  

**NutrientProfileJSON:** (abbreviated)
```json
{
  "calories": 364,
  "totalFat": 0.98,
  "saturatedFat": 0.155,
  "protein": 10.33,
  "totalCarbohydrate": 76.31,
  "dietaryFiber": 2.7,
  ...
}
```

**FoodPortionsJSON:**
```json
[
  {
    "id": 123456,
    "amount": 1.0,
    "gramWeight": 125,
    "modifier": "unsifted, spooned into cup",
    "measureUnit": {
      "id": 1005,
      "name": "cup",
      "abbreviation": "cup"
    }
  }
]
```

**CustomConversionJSON:**
```json
{
  "cup": 120
}
```
*(User override: prefers 120g per cup for their flour)*

---

## Best Practices

### Data Entry

✅ **DO:**
- Use the application to create records (ensures valid JSON structure)
- Let the app calculate `RawTotalWeight`, `YieldPercentage`, etc.
- Always weigh final cooked product for accuracy
- Add custom conversions for frequently used ingredients

❌ **DON'T:**
- Manually edit JSON fields unless you're confident in JSON syntax
- Delete records that are referenced in other recipes (check first)
- Use negative numbers for weights or percentages

### Data Integrity

- **Backup regularly:** Use Airtable's native backup features
- **Version history:** Airtable tracks all changes automatically
- **Testing:** Create test records in a separate view before production use

### Performance

- **Views:** Create filtered views for easier navigation
  - "Recent Recipes" (filter by CreatedAt)
  - "By Cooking Method" (group by CookingMethod)
  - "High Yield Loss" (filter YieldPercentage < 80)
- **Indexing:** FdcId in USDACache is essentially an index
- **Limits:** Be aware of Airtable record limits (varies by plan)

---

## Troubleshooting

### Problem: "Invalid API key"

**Solution:**
- Verify PAT token is correct (no extra spaces)
- Verify PAT has `data.records:read` and `data.records:write` scopes
- Verify PAT has access to the "Nutrition App" base
- Regenerate token if needed

### Problem: "Table not found"

**Solution:**
- Check table names are EXACT (case-sensitive)
- Verify `AIRTABLE_SUBRECIPES_TABLE` env variable matches actual table name
- Check Base ID is correct

### Problem: "Field validation error"

**Solution:**
- Ensure field types match schema above
- Check for required fields (Name, IngredientsJSON, etc.)
- Validate JSON syntax in stringified fields

### Problem: "Record limit reached"

**Solution:**
- Check your Airtable plan limits
- Archive old/test records
- Consider upgrading plan
- Implement data cleanup strategy

---

## Migration to Phase 2 (Future)

When ready to normalize the data structure (see RISK_ASSESSMENT.md Risk #3):

1. Export all data from current tables
2. Create new normalized tables
3. Parse JSON and populate new structure
4. Update application code
5. Run in parallel for testing
6. Cut over to new schema
7. Archive old tables (keep for rollback)

**Timeline:** After 500+ recipes or when advanced querying needed

---

## Support & Resources

- **Airtable Documentation:** https://airtable.com/developers/web/api/introduction
- **Airtable Community:** https://community.airtable.com/
- **Project Documentation:** See `MIGRATION_PLAN.md` and `RISK_ASSESSMENT.md`

---

**Status:** ✅ Ready for Base Creation  
**Next Steps:**
1. Create the three tables following this guide
2. Generate PAT token
3. Add credentials to `.env.local`
4. Proceed with Phase 2 implementation (Airtable service layer)

**Last Updated:** October 22, 2025
