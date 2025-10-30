# 🚀 Airtable Schema Update - Ingredient Override System

**Date:** October 29, 2025
**Status:** Required for ingredient override functionality

---

## 📋 Current Tables (from AIRTABLE_MANUAL_SETUP.md)

Your base currently has these tables:
- ✅ **SubRecipes** (12 fields)
- ✅ **FinalDishes** (13 fields)
- ✅ **USDACache** (9 fields)

---

## 🆕 New Tables Required

### 1. UserIngredients Table (15 fields)

**Purpose:** Store custom ingredient overrides with user-corrected nutrition data

#### Create New Table
1. In your Airtable base, click "+" next to table tabs
2. Choose "Start from scratch"
3. Name: **UserIngredients**

#### Add Fields (in this order):

| # | Field Name | Type | Configuration |
|---|------------|------|---------------|
| 1 | **Name** | Single line text | Primary field |
| 2 | **OriginalFdcId** | Number | 0 decimals, no negatives |
| 3 | **OriginalUSDAName** | Single line text | - |
| 4 | **CustomNutrientsJSON** | Long text | No rich text |
| 5 | **ServingSizeGrams** | Number | 1 decimal place |
| 6 | **ServingSizeDescription** | Single line text | - |
| 7 | **Brand** | Single line text | - |
| 8 | **Category** | Single select | Add options below |
| 9 | **Tags** | Multiple select | Allow custom values: YES |
| 10 | **Source** | Single select | Add options below |
| 11 | **OverrideReason** | Long text | No rich text |
| 12 | **UsageCount** | Number | 0 decimals |
| 13 | **CreatedBy** | Single line text | - |
| 14 | **CreatedAt** | Created time | Auto-generated |
| 15 | **UpdatedAt** | Last modified time | Auto-generated |

#### Category Options (Single Select):
- Proteins (Blue)
- Dairy (Green)
- Fruits (Orange)
- Vegetables (Purple)
- Grains (Yellow)
- Fats/Oils (Red)
- Spices/Seasonings (Pink)
- Beverages (Teal)
- Sweets (Gray)
- Other (Black)

#### Source Options (Single Select):
- Manual Entry (Blue)
- USDA Override (Orange)
- Photo OCR (Green)
- Community (Purple)
- Imported (Gray)

---

### 2. OverridesHistory Table (8 fields)

**Purpose:** Track changes to UserIngredients for audit trail and debugging

#### Create New Table
1. In your Airtable base, click "+" next to table tabs
2. Choose "Start from scratch"
3. Name: **OverridesHistory**

#### Add Fields (in this order):

| # | Field Name | Type | Configuration |
|---|------------|------|---------------|
| 1 | **IngredientId** | Link to another record | Link to UserIngredients (single record) |
| 2 | **Action** | Single select | Add options below |
| 3 | **OldNutrientsJSON** | Long text | No rich text |
| 4 | **NewNutrientsJSON** | Long text | No rich text |
| 5 | **ChangedFields** | Multiple select | Add options below |
| 6 | **ChangedBy** | Single line text | - |
| 7 | **Reason** | Long text | No rich text |
| 8 | **Timestamp** | Created time | Auto-generated |

#### Action Options (Single Select):
- Created (Green)
- Updated (Blue)
- Deleted (Red)
- Restored (Yellow)

#### ChangedFields Options (Multiple Select):
- name
- customNutrients
- servingSizeGrams
- servingSizeDescription
- brand
- category
- tags
- overrideReason

---

## 🔧 Environment Variables Update

Add this new environment variable to your `.env.local` and Vercel:

```bash
# Add to existing Airtable config
AIRTABLE_OVERRIDES_HISTORY_TABLE=OverridesHistory
```

Your complete Airtable environment variables should now be:

```bash
AIRTABLE_PAT_TOKEN=your_personal_access_token_here
AIRTABLE_BASE_ID=appypvroUCuby2grq
AIRTABLE_SUBRECIPES_TABLE=SubRecipes
AIRTABLE_FINALDISHES_TABLE=FinalDishes
AIRTABLE_USDACACHE_TABLE=USDACache
AIRTABLE_USER_INGREDIENTS_TABLE=UserIngredients
AIRTABLE_OVERRIDES_HISTORY_TABLE=OverridesHistory
```

---

## ✅ Verification Steps

After creating both tables:

### UserIngredients Table Check:
- [ ] 15 fields created in correct order
- [ ] Name field is primary (first column)
- [ ] Category field has 10 options configured
- [ ] Source field has 5 options configured
- [ ] Tags field allows custom values
- [ ] Number fields have correct decimal precision
- [ ] CreatedAt/UpdatedAt are auto-generated timestamps

### OverridesHistory Table Check:
- [ ] 8 fields created in correct order
- [ ] IngredientId links to UserIngredients table
- [ ] Action field has 4 options configured
- [ ] ChangedFields has 8 options configured
- [ ] Timestamp is auto-generated

### Environment Variables Check:
- [ ] AIRTABLE_OVERRIDES_HISTORY_TABLE added to .env.local
- [ ] Variable added to Vercel environment variables
- [ ] Redeploy triggered in Vercel

---

## 🧪 Testing the Setup

Once tables are created and environment variables updated:

1. **Test UserIngredients API:**
   ```bash
   # Create a test ingredient
   curl -X POST http://localhost:3000/api/user-ingredients \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Chicken Breast",
       "customNutrients": {"calories": 165, "protein": 31.0},
       "servingSizeGrams": 100,
       "servingSizeDescription": "100g",
       "category": "Proteins",
       "source": "Manual Entry"
     }'
   ```

2. **Test History Tracking:**
   ```bash
   # Update the ingredient to trigger history
   curl -X PUT http://localhost:3000/api/user-ingredients/[ID] \
     -H "Content-Type: application/json" \
     -d '{"customNutrients": {"calories": 155, "protein": 32.0}}'
   ```

3. **Test History API:**
   ```bash
   # Check history was created
   curl http://localhost:3000/api/user-ingredients/[ID]/history
   ```

4. **Test Search Integration:**
   - Visit recipe creation pages
   - Search for ingredients
   - Verify custom ingredients appear with "Custom" badges

---

## 📊 Expected Behavior

After setup is complete:

- ✅ **Ingredient Search**: UserIngredients appear first in search results with blue "Custom" badges
- ✅ **Override Creation**: Users can click override button on any USDA ingredient to create custom versions
- ✅ **History Tracking**: All changes are logged in OverridesHistory table
- ✅ **Recipe Integration**: Custom ingredients can be used in sub-recipes and final dishes
- ✅ **Audit Trail**: Complete change history available via history viewer

---

## 🆘 Troubleshooting

### "Table not found" errors:
- Double-check table names match exactly (case-sensitive)
- Ensure environment variables are updated in Vercel and redeployed

### "Field not found" errors:
- Verify all fields exist with exact names
- Check field types match API expectations

### History not being created:
- Check OverridesHistory table permissions
- Verify IngredientId field links correctly to UserIngredients

### Search not showing custom ingredients:
- Check USDA search API is updated
- Verify UserIngredients table has data
- Check environment variables

---

## 📈 Next Steps After Setup

1. **Test End-to-End**: Create a custom ingredient and use it in a recipe
2. **User Testing**: Have users test the override workflow
3. **Performance Monitoring**: Monitor API response times with new tables
4. **Backup Strategy**: Include new tables in regular Airtable backups

---

**Estimated Time:** 15-20 minutes for table creation and configuration

**Priority:** HIGH - Required for ingredient override system to function</content>
<parameter name="filePath">/Users/samuelholley/Projects/gather_kitchen_nutrition_labels/AIRTABLE_SCHEMA_UPDATE.md