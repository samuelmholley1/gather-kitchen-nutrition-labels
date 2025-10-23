# 🚀 Airtable Manual Setup Guide

## Current Situation
- ✅ Base created: `appJcMC1FeOF4991w`
- ✅ PAT token exists
- ❌ PAT token lacks schema modification permissions
- ⚠️ One default table exists (can't delete it)

## 📋 Manual Setup Steps (5 Minutes)

### Step 1: Rename the Default Table
1. Open your base: https://airtable.com/appJcMC1FeOF4991w
2. Click on the default table name (probably "Table 1")
3. Rename it to: **SubRecipes**

### Step 2: Create Table #2 - FinalDishes
1. Click "Add or import" button (near top left)
2. Select "Add table"
3. Name it: **FinalDishes**
4. Click "Create table"

### Step 3: Create Table #3 - USDACache
1. Click "Add or import" button again
2. Select "Add table"
3. Name it: **USDACache**
4. Click "Create table"

---

## 📊 Field Configuration

Now add fields to each table. Copy/paste the field names exactly!

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
AIRTABLE_BASE_ID=appJcMC1FeOF4991w
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
