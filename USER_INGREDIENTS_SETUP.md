# UserIngredients Table Setup - Ingredient Override System

**Table Name:** UserIngredients
**Purpose:** Store custom ingredient overrides with user-corrected nutrition data
**Last Updated:** October 29, 2025

---

## Table Structure

### Create New Table

1. In your Airtable base, click "+" next to table tabs
2. Choose "Start from scratch"
3. Name: **UserIngredients**

### Create Fields

| # | Field Name | Field Type | Options/Description |
|---|------------|------------|---------------------|
| 1 | **Name** | Single line text | Ingredient name (primary field) |
| 2 | **OriginalFdcId** | Number | Original USDA FDC ID (if overridden) |
| 3 | **OriginalUSDAName** | Single line text | Original USDA food description |
| 4 | **CustomNutrientsJSON** | Long text | User-defined nutrient profile (per 100g) |
| 5 | **ServingSizeGrams** | Number | Standard serving size |
| 6 | **ServingSizeDescription** | Single line text | Human-readable serving size |
| 7 | **Brand** | Single line text | Brand name (optional) |
| 8 | **Category** | Single select | Food category for organization |
| 9 | **Tags** | Multiple select | Tags for searching/filtering |
| 10 | **Source** | Single select | How this ingredient was created |
| 11 | **OverrideReason** | Long text | Why this override was created |
| 12 | **UsageCount** | Number | How many times this ingredient has been used |
| 13 | **CreatedBy** | Single line text | User who created this ingredient |
| 14 | **CreatedAt** | Created time | Auto-generated timestamp |
| 15 | **UpdatedAt** | Last modified time | Auto-generated timestamp |

### Field Configuration Details

**Name:**
- Field type: Single line text
- Primary field (first column)
- Example: "Organic Chicken Breast", "Heinz Ketchup 38oz"

**OriginalFdcId:**
- Field type: Number
- Precision: 0 decimal places
- Allow negative numbers: NO
- Links to USDACache table (optional relationship)

**OriginalUSDAName:**
- Field type: Single line text
- Example: "Chicken, broiler, breast, meat only, cooked, roasted"

**CustomNutrientsJSON:**
- Field type: Long text
- Enable rich text formatting: NO
- Required field
- Example:
  ```json
  {
    "calories": 165,
    "totalFat": 3.6,
    "saturatedFat": 1.0,
    "transFat": 0,
    "cholesterol": 85,
    "sodium": 74,
    "totalCarbohydrate": 0,
    "dietaryFiber": 0,
    "sugars": 0,
    "protein": 31.0,
    "vitaminA": 0,
    "vitaminC": 0,
    "calcium": 15,
    "iron": 1.3
  }
  ```

**ServingSizeGrams:**
- Field type: Number
- Precision: 1 decimal place
- Default: 100
- Allow negative numbers: NO

**ServingSizeDescription:**
- Field type: Single line text
- Example: "3 oz (85g)", "1 cup (240ml)", "1 medium (150g)"

**Brand:**
- Field type: Single line text
- Optional
- Example: "Heinz", "Organic Valley", "Kirkland Signature"

**Category:**
- Field type: Single select
- Options (add these categories):
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

**Tags:**
- Field type: Multiple select
- Allow custom values: YES
- Examples: "organic", "gluten-free", "low-sodium", "house-made", "corrected"

**Source:**
- Field type: Single select
- Options:
  - Manual Entry (Blue) - Created from scratch
  - USDA Override (Orange) - Modified from USDA data
  - Photo OCR (Green) - Created from photo analysis
  - Community (Purple) - Shared from other users
  - Imported (Gray) - From CSV/bulk import

**OverrideReason:**
- Field type: Long text
- Required when Source is "USDA Override"
- Examples:
  - "USDA data shows 200 cal/100g but lab test shows 180 cal/100g"
  - "Brand-specific nutrition differs from generic USDA data"
  - "Cooking method affects nutrient profile"

**UsageCount:**
- Field type: Number
- Precision: 0 decimal places
- Default: 0
- Auto-increment when ingredient is used in recipes

**CreatedBy:**
- Field type: Single line text
- For future multi-user support
- Default: "system" or user identifier

---

## Integration Points

### USDA Search Priority
When searching for ingredients:
1. **First**: Check UserIngredients table for exact matches
2. **Second**: Check UserIngredients table for fuzzy matches
3. **Third**: Fall back to USDA database

### Override History Tracking
Each time a UserIngredient is created/modified, create a record in OverridesHistory table:

**OverridesHistory Table Structure:**
- IngredientId (link to UserIngredients)
- Action (Created/Updated/Deleted)
- OldNutrientsJSON (previous values)
- NewNutrientsJSON (new values)
- ChangedBy (user identifier)
- Reason (explanation)
- Timestamp (auto-generated)

### Recipe Integration
When building recipes:
- UserIngredients appear in search results with special indicator
- Show override reason in ingredient details
- Track usage statistics

---

## Example Records

### Example 1: USDA Override
**Name:** Kirkland Signature Organic Chicken Breast
**OriginalFdcId:** 171477
**OriginalUSDAName:** Chicken, broiler, breast, meat only, cooked, roasted
**CustomNutrientsJSON:**
```json
{
  "calories": 155,
  "protein": 32.0,
  "totalFat": 2.8,
  "sodium": 65
}
```
**ServingSizeGrams:** 100
**Brand:** Kirkland Signature
**Category:** Proteins
**Tags:** ["organic", "corrected"]
**Source:** USDA Override
**OverrideReason:** Lab testing shows 10% lower calories than USDA generic data

### Example 2: Manual Entry
**Name:** House-Made Balsamic Vinaigrette
**CustomNutrientsJSON:**
```json
{
  "calories": 120,
  "totalFat": 12.0,
  "sodium": 180,
  "totalCarbohydrate": 4.0,
  "sugars": 3.0
}
```
**ServingSizeGrams:** 30
**ServingSizeDescription:** 2 tbsp (30g)
**Category:** Fats/Oils
**Tags:** ["house-made", "dressing"]
**Source:** Manual Entry
**OverrideReason:** Custom recipe with known ingredients

---

## API Endpoints Needed

### GET /api/user-ingredients
- List all user ingredients
- Support search/filtering
- Pagination support

### POST /api/user-ingredients
- Create new user ingredient
- Validate nutrient data
- Auto-generate serving descriptions

### PUT /api/user-ingredients/[id]
- Update existing ingredient
- Track changes in history
- Validate data integrity

### DELETE /api/user-ingredients/[id]
- Soft delete (mark as inactive)
- Prevent deletion if used in recipes

### GET /api/user-ingredients/search?q=query
- Search user ingredients
- Return formatted for USDA search integration

---

## UI Components Needed

### IngredientOverrideModal
- Modal for editing ingredient nutrition
- Fields for all nutrients
- Save/Cancel actions
- Validation feedback

### UserIngredientSelector
- Dropdown/autocomplete for selecting user ingredients
- Show override indicators
- Quick preview of nutrition data

### OverrideHistoryViewer
- Show change history for ingredients
- Compare old vs new values
- Show reasons for changes

---

## Migration Strategy

### Phase 1: Basic Override System
1. Create UserIngredients table
2. Implement basic CRUD API
3. Add override UI to recipe builder
4. Integrate with USDA search

### Phase 2: Advanced Features
1. Add OverridesHistory table
2. Implement usage tracking
3. Add community sharing features
4. Add bulk import/export

---

## Testing Checklist

- [ ] Can create user ingredient from USDA override
- [ ] Can create user ingredient manually
- [ ] Override appears in search results
- [ ] Override takes priority over USDA data
- [ ] Nutrition calculations use override values
- [ ] History tracking works for changes
- [ ] Cannot delete ingredient used in recipes
- [ ] Search and filtering work correctly

---

**Status:** Ready for implementation
**Next Step:** Create table in Airtable base</content>
<parameter name="filePath">/Users/samuelholley/Projects/gather_kitchen_nutrition_labels/USER_INGREDIENTS_SETUP.md