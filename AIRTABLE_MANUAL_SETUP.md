# 🚀 Airtable Manual Setup Guide - CSV Import Method

## Current Situation
- ✅ Base created: `appypvroUCuby2grq` (Nutrition App)
- ✅ All 3 tables imported successfully from CSV blocks
- ✅ PAT token configured
- ✅ Ready to configure special fields

---

## 🎯 EASIEST METHOD: CSV Import (2 Minutes!)

### Step 1: Import SubRecipes Table
1. Open your base: https://airtable.com/appypvroUCuby2grq
2. Click "Add or import" → "CSV file"
3. Copy the CSV block below and save as `SubRecipes.csv`
4. Upload the file
5. Name the table: **SubRecipes**

**CSV for SubRecipes:**
```csv
Name,Ingredients,TotalWeight,YieldMultiplier,ServingSize,ServingsPerRecipe,NutritionProfile,CustomConversions,Category,Notes,CreatedAt,UpdatedAt
Marinara Sauce,"[{""id"":""1"",""name"":""Tomatoes"",""quantity"":800,""unit"":""grams""}]",750,0.94,100,7.5,"{""calories"":45,""protein"":2,""totalFat"":0.5,""totalCarbohydrate"":9,""dietaryFiber"":2,""totalSugars"":6,""addedSugars"":0,""saturatedFat"":0,""transFat"":0,""cholesterol"":0,""sodium"":300,""vitaminD"":0,""calcium"":20,""iron"":1,""potassium"":400}","{}",Sauce,Classic Italian tomato sauce,2025-10-23T12:00:00Z,2025-10-23T12:00:00Z
```

### Step 2: Import FinalDishes Table
1. Click "Add or import" → "CSV file"
2. Copy the CSV block below and save as `FinalDishes.csv`
3. Upload the file
4. Name the table: **FinalDishes**

**CSV for FinalDishes:**
```csv
Name,Components,TotalWeight,ServingSize,ServingsPerContainer,NutritionLabel,SubRecipeLinks,Allergens,Category,Notes,CreatedAt,UpdatedAt,Status
Spaghetti with Marinara,"[{""type"":""subRecipe"",""id"":""recXXX"",""name"":""Marinara Sauce"",""quantity"":200,""unit"":""grams""},{""type"":""ingredient"",""fdcId"":123456,""name"":""Spaghetti pasta"",""quantity"":100,""unit"":""grams""}]",300,150,2,"{""servingSize"":150,""servingsPerContainer"":2,""calories"":280,""totalFat"":2,""saturatedFat"":0.5,""transFat"":0,""cholesterol"":0,""sodium"":450,""totalCarbohydrate"":55,""dietaryFiber"":4,""totalSugars"":8,""addedSugars"":0,""protein"":10,""vitaminD"":0,""calcium"":40,""iron"":3,""potassium"":500}",,"Wheat",Pasta,Fresh marinara with al dente pasta,2025-10-23T12:00:00Z,2025-10-23T12:00:00Z,Active
```

### Step 3: Import USDACache Table
1. Click "Add or import" → "CSV file"
2. Copy the CSV block below and save as `USDACache.csv`
3. Upload the file
4. Name the table: **USDACache**

**CSV for USDACache:**
```csv
FdcId,Description,FoodData,DataType,BrandOwner,Portions,CachedAt,HitCount,LastUsed
171289,Tomatoes raw,"{""fdcId"":171289,""description"":""Tomatoes, raw"",""foodNutrients"":[{""nutrientId"":1008,""nutrientName"":""Energy"",""value"":18,""unitName"":""kcal""}]}",Foundation,,"[{""amount"":1,""gramWeight"":123,""modifier"":""medium""}]",2025-10-23T12:00:00Z,5,2025-10-23T12:00:00Z
```

### Step 4: Delete Default Table
1. After importing all 3 tables, click on the original "Table 1"
2. Click the dropdown arrow next to the table name
3. Select "Delete table"
4. Confirm deletion

---

## � Post-Import Configuration

After importing, you need to configure special field types that CSV can't handle:

### SubRecipes Table - No special fields needed! ✅

### FinalDishes Table - Configure 3 fields:

1. **SubRecipeLinks** field:
   - Click the field header
   - Change type to: "Link to another record"
   - Select: "SubRecipes" table
   - Allow linking to multiple records: Yes

2. **Allergens** field:
   - Click the field header
   - Change type to: "Multiple select"
   - Add these options (click each time):
     - Milk
     - Eggs

     AND TH
     - Fish
     - Shellfish
     - Tree Nuts
     - Peanuts
     - Wheat
     - Soybeans
     - Sesame

3. **Status** field:
   - Click the field header
   - Change type to: "Single select"
   - Add these options:
     - Draft (default)
     - Active
     - Archived

### USDACache Table - Configure 1 field:

1. **DataType** field:
   - Click the field header
   - Change type to: "Single select"
   - Add these options:
     - Foundation
     - SR Legacy
     - Survey (FNDDS)
     - Branded

---

## 📊 Alternative: Manual Field Configuration

If CSV import doesn't work, add fields manually:

### Table 1: SubRecipes

**Click "+ Add Field" and create these (in order):**

1. **Name** (Single line text)
2. **Ingredients** (Long text)
3. **TotalWeight** (Number - 2 decimals)
4. **YieldMultiplier** (Number - 3 decimals)
5. **ServingSize** (Number - 2 decimals)
6. **ServingsPerRecipe** (Number - 1 decimal)
7. **NutritionProfile** (Long text)
8. **CustomConversions** (Long text)
9. **Category** (Single line text)
10. **Notes** (Long text)
11. **CreatedAt** (Date with time)
12. **UpdatedAt** (Date with time)

### Table 2: FinalDishes

**Click "+ Add Field" and create these:**

1. **Name** (Single line text)
2. **Components** (Long text)
3. **TotalWeight** (Number - 2 decimals)
4. **ServingSize** (Number - 2 decimals)
5. **ServingsPerContainer** (Number - 1 decimal)
6. **NutritionLabel** (Long text)
7. **SubRecipeLinks** (Link to another record → Link to SubRecipes table)
8. **Allergens** (Multiple select)
   - Add options: Milk, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soybeans, Sesame
9. **Category** (Single line text)
10. **Notes** (Long text)
11. **CreatedAt** (Date with time)
12. **UpdatedAt** (Date with time)
13. **Status** (Single select)
    - Add options: Draft, Active, Archived

### Table 3: USDACache

**Click "+ Add Field" and create these:**

1. **FdcId** (Number - 0 decimals)
2. **Description** (Single line text)
3. **FoodData** (Long text)
4. **DataType** (Single select)
   - Add options: Foundation, SR Legacy, Survey (FNDDS), Branded
5. **BrandOwner** (Single line text)
6. **Portions** (Long text)
7. **CachedAt** (Date with time)
8. **HitCount** (Number - 0 decimals)
9. **LastUsed** (Date with time)

---

## ✅ Verification Checklist

After setup, verify you have:
- [ ] 3 tables: SubRecipes, FinalDishes, USDACache
- [ ] SubRecipes has 12 fields
- [ ] FinalDishes has 13 fields
- [ ] USDACache has 9 fields
- [ ] SubRecipeLinks field in FinalDishes links to SubRecipes table
- [ ] All "Multiple select" fields have their options configured
- [ ] All "Single select" fields have their options configured

---

## 🔧 Update Vercel Environment Variables

Once tables are set up, add these to Vercel:

1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add these variables (use values from your .env.local file):

```
AIRTABLE_PAT_TOKEN=your_airtable_pat_token_here
AIRTABLE_BASE_ID=appypvroUCuby2grq
AIRTABLE_SUBRECIPES_TABLE=SubRecipes
AIRTABLE_FINALDISHES_TABLE=FinalDishes
AIRTABLE_USDACACHE_TABLE=USDACache
USDA_API_KEY=your_usda_api_key_here
```

3. Save all variables
4. Redeploy your app (Vercel → Deployments → Redeploy)

---

## 🎯 What This Enables

Once setup is complete, your app will be able to:
- ✅ Save sub-recipes to Airtable
- ✅ Load sub-recipes from Airtable
- ✅ Create final dishes
- ✅ Generate nutrition labels
- ✅ Cache USDA API responses (faster, fewer API calls)
- ✅ Track allergens
- ✅ Export nutrition labels as images

---

## 🆘 Troubleshooting

### "Can't delete the first table"
- **Solution:** Just rename it to "SubRecipes" (it's fine to keep it!)

### "SubRecipeLinks field not working"
- Make sure you selected "Link to another record"
- Make sure you selected "SubRecipes" as the target table

### "Missing field options"
- For Multiple Select fields (Allergens, DataType), click the field settings and add all options
- For Single Select fields (Status), do the same

### "Still getting errors"
- Double-check field names match exactly (case-sensitive!)
- Make sure number fields have correct decimal precision
- Make sure date fields include time

---

## 📞 Next Steps After Setup

Once all tables and fields are configured:

1. **Test locally:**
   ```bash
   yarn dev
   # Visit http://localhost:3000
   # Try creating a sub-recipe
   ```

2. **Deploy to Vercel:**
   - Push to GitHub (if not done)
   - Add env vars to Vercel
   - Redeploy

3. **Build API routes** (if not done yet)
   - See PHASE_4_UI_SUMMARY.md for API route implementation

---

**Estimated Time:** 10-15 minutes for careful manual setup

**Why Manual?** Your PAT token doesn't have `schema.bases:write` permission, so we can't create tables programmatically. But manual setup is just as good and gives you full control!
