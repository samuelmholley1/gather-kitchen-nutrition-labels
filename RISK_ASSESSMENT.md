# Risk Assessment & Mitigation Strategies

**Project:** Gather Kitchen Nutrition Labels  
**Purpose:** Proactive identification and mitigation of high-risk failure points  
**Status:** Pre-Implementation Planning  
**Last Updated:** October 22, 2025

---

## Executive Summary

This document identifies three critical risks that could compromise the accuracy, usability, and credibility of the nutrition calculator application. For each risk, we provide:

1. **Detailed Challenge Description** - Why this is a problem
2. **Impact Assessment** - Consequences of failure
3. **Concrete Mitigation Strategy** - Technical implementation plan
4. **Acceptance Criteria** - How we verify the solution works

All mitigation strategies will be **built into the initial implementation**, not deferred to future phases.

---

## Risk 1: Unit Conversion Inaccuracy

### 🔴 Severity: CRITICAL
**Category:** Data Accuracy  
**Likelihood:** HIGH (USDA data gaps are common)  
**Business Impact:** Loss of credibility, potential legal liability, user abandonment

### The Challenge

**Problem Statement:**  
Converting volumetric units (cups, tablespoons, fluid ounces) to mass (grams) is inherently problematic because:

1. **Density Varies by Food Item**
   - 1 cup of flour ≠ 1 cup of sugar ≠ 1 cup of water
   - Packing method affects volume (sifted vs. packed flour)
   - Temperature affects density (cold butter vs. melted butter)

2. **USDA `foodPortions` Data is Incomplete**
   - Not all ingredients have portion data
   - Some foods have generic portions ("1 serving") without gram weights
   - Branded foods often lack detailed portion information

3. **Generic Fallback Tables are Unreliable**
   - Standard conversion (1 cup = 236.588g) assumes water density
   - Real-world ingredients have vastly different densities:
     - All-purpose flour: ~120g per cup
     - Granulated sugar: ~200g per cup
     - Honey: ~340g per cup
     - Olive oil: ~216g per cup

**Example Failure Scenario:**
```
User creates "Chocolate Chip Cookies" with:
- 2 cups all-purpose flour
- System uses water density (2 cups = 473g)
- Reality: 2 cups flour = 240g
- Error: 97% over-estimation of flour weight
- Result: Nutrition data is completely wrong
```

### Impact Assessment

| Impact Area | Consequence |
|-------------|-------------|
| **Accuracy** | Nutrition labels could be off by 50-200% |
| **Legal** | FDA compliance violations if labels are materially inaccurate |
| **User Trust** | Professional chefs/nutritionists will immediately spot errors |
| **Business** | Reputation damage, potential liability for allergen miscalculations |

### Mitigation Strategy

**Solution: User-Defined Conversion Factor Override System**

#### Technical Implementation

**1. Extend USDACache Table Schema**

Add new field to Airtable `USDACache` table:

| Field Name | Type | Description |
|------------|------|-------------|
| CustomConversionJSON | Long text | User-defined conversion factors (stringified JSON) |

**Schema Example:**
```json
{
  "cup": 120,        // User-defined: 1 cup of this flour = 120g
  "tbsp": 8,         // User-defined: 1 tbsp = 8g
  "tsp": 2.7         // User-defined: 1 tsp = 2.7g
}
```

**2. Update TypeScript Interfaces**

```typescript
// /src/types/nutrition.ts
export interface USDAFood {
  fdcId: number
  name: string
  nutrientProfile: NutrientProfile
  foodPortions?: FoodPortion[]
  customConversions?: Record<string, number>  // NEW: User overrides
}

export interface FoodPortion {
  id: number
  amount: number
  gramWeight: number
  modifier: string
  measureUnit: {
    name: string
    abbreviation: string
  }
}
```

**3. Enhanced Conversion Logic Priority**

Update `/src/lib/calculator.ts` with 4-tier priority system:

```typescript
/**
 * Convert ingredient quantity to grams using 4-tier priority system:
 * 1. User-defined custom conversions (highest priority)
 * 2. USDA foodPortions data
 * 3. Standard conversion table
 * 4. Error/manual entry required (lowest priority)
 */
export function convertToGrams(
  quantity: number,
  unit: string,
  usdaFood?: USDAFood
): { grams: number; confidence: 'high' | 'medium' | 'low' | 'unknown' } {
  
  // PRIORITY 1: User-defined custom conversion (HIGHEST CONFIDENCE)
  if (usdaFood?.customConversions?.[unit]) {
    return {
      grams: quantity * usdaFood.customConversions[unit],
      confidence: 'high'
    }
  }
  
  // PRIORITY 2: USDA foodPortions data (HIGH CONFIDENCE)
  if (usdaFood?.foodPortions) {
    const portion = findMatchingPortion(unit, usdaFood.foodPortions)
    if (portion) {
      const gramsPerUnit = portion.gramWeight / portion.amount
      return {
        grams: quantity * gramsPerUnit,
        confidence: 'high'
      }
    }
  }
  
  // PRIORITY 3: Standard conversion table (MEDIUM CONFIDENCE)
  const standardConversion = STANDARD_CONVERSIONS[unit.toLowerCase()]
  if (standardConversion) {
    return {
      grams: quantity * standardConversion,
      confidence: 'medium'
    }
  }
  
  // PRIORITY 4: Unknown unit (LOW CONFIDENCE - FLAG FOR USER)
  return {
    grams: 0,
    confidence: 'unknown'
  }
}
```

**4. UI for Custom Conversion Management**

Create `/src/components/CustomConversionEditor.tsx`:

**Features:**
- Display when user selects a USDA ingredient
- Show existing conversions (USDA portions + custom)
- Allow user to add/edit/delete custom conversions
- Visual indicator: 🔧 for custom values, 📊 for USDA values
- Persist to Airtable USDACache immediately

**UI Mockup:**
```
┌─────────────────────────────────────────────┐
│ All-Purpose Flour (USDA #12345)            │
├─────────────────────────────────────────────┤
│ Conversions:                                │
│                                             │
│ 1 cup = [120] g  🔧 Custom  [Edit] [Delete]│
│ 1 tbsp = [8] g   📊 USDA                   │
│ 1 tsp = [2.7] g  🔧 Custom  [Edit] [Delete]│
│                                             │
│ [+ Add Custom Conversion]                   │
└─────────────────────────────────────────────┘
```

**5. Confidence Indicator in Recipe Builder**

Show conversion confidence to user in real-time:

```typescript
// In ingredient row component
{confidence === 'unknown' && (
  <div className="text-red-600 text-sm">
    ⚠️ Unknown unit. Please define custom conversion or use grams.
  </div>
)}

{confidence === 'medium' && (
  <div className="text-yellow-600 text-sm">
    ⚡ Using standard conversion. Consider adding custom value for accuracy.
  </div>
)}

{confidence === 'high' && (
  <div className="text-green-600 text-sm">
    ✓ {customConversion ? 'Custom conversion' : 'USDA portion data'}
  </div>
)}
```

#### Implementation Checklist

- [ ] Add `CustomConversionJSON` field to Airtable USDACache table
- [ ] Update TypeScript interfaces in `/src/types/nutrition.ts`
- [ ] Implement 4-tier priority logic in `/src/lib/calculator.ts`
- [ ] Create `CustomConversionEditor.tsx` component
- [ ] Add confidence indicators to ingredient rows
- [ ] Update Airtable service layer to save/load custom conversions
- [ ] Write unit tests for conversion priority logic
- [ ] Create user documentation for custom conversions

#### Acceptance Criteria

✅ **Test Case 1: User Override Works**
- User adds custom conversion "1 cup flour = 120g"
- System uses 120g (not USDA or standard conversion)
- Confidence indicator shows "Custom conversion"

✅ **Test Case 2: USDA Fallback Works**
- Ingredient has USDA portion data
- No custom conversion defined
- System uses USDA data
- Confidence indicator shows "USDA portion data"

✅ **Test Case 3: Unknown Unit Flags**
- User enters unusual unit ("handful", "dash")
- System shows warning
- User is prompted to define conversion or use grams

✅ **Test Case 4: Persistence**
- Custom conversions save to Airtable
- Custom conversions load on subsequent uses
- Multiple users can have different custom conversions (future multi-user)

---

## Risk 2: Failure to Account for Cooking Yields

### 🔴 Severity: CRITICAL
**Category:** Calculation Accuracy  
**Likelihood:** MEDIUM-HIGH (Users will forget or misunderstand)  
**Business Impact:** Inaccurate nutrition labels, FDA compliance issues

### The Challenge

**Problem Statement:**  
Summing raw ingredient weights and calculating "per 100g" nutrition is fundamentally incorrect because:

1. **Water Loss During Cooking**
   - Roasted vegetables lose 20-40% weight from evaporation
   - Baked goods lose moisture (bread, cookies, cakes)
   - Grilled meats lose 25-30% weight from fat/water rendering

2. **Water Gain During Cooking**
   - Rice absorbs water (100g dry → 250g cooked)
   - Pasta absorbs water (100g dry → 200g cooked)
   - Beans triple in weight when cooked

3. **Current Calculator Logic is Wrong**
   ```typescript
   // WRONG APPROACH:
   Total raw ingredients: 500g
   Calculated nutrients per 100g based on 500g
   
   // REALITY:
   Total raw ingredients: 500g
   Final cooked weight: 350g (30% water loss)
   Nutrients are now concentrated!
   Should calculate per 100g based on 350g
   ```

**Example Failure Scenario:**
```
Recipe: Roasted Vegetables
- Raw ingredients: 1000g (mixed vegetables)
- After roasting: 650g (35% moisture loss)

WRONG calculation:
- Calories per 100g = Total calories / 10 (1000g ÷ 100)
- Result: 50 calories per 100g

CORRECT calculation:
- Calories per 100g = Total calories / 6.5 (650g ÷ 100)
- Result: 77 calories per 100g

Error: 54% under-reporting of calories!
```

### Impact Assessment

| Impact Area | Consequence |
|-------------|-------------|
| **Accuracy** | Nutrition data off by 30-200% for cooked foods |
| **FDA Compliance** | Labels must reflect "as consumed" not "as prepared" |
| **User Safety** | Diabetics/allergen-sensitive users rely on accurate data |
| **Legal Liability** | Misrepresenting calories could lead to lawsuits |

### Mitigation Strategy

**Solution: Mandatory Final Cooked Weight Input with Smart Defaults**

#### Technical Implementation

**1. Update Data Models**

```typescript
// /src/types/nutrition.ts

export interface SubRecipe {
  id: string
  name: string
  ingredients: Ingredient[]
  nutrientProfile: NutrientProfile  // Per 100g of FINAL weight
  servingSizeGrams: number
  
  // NEW FIELDS:
  rawTotalWeight: number      // Sum of all raw ingredients (auto-calculated)
  finalCookedWeight: number   // User-entered actual final weight
  yieldPercentage: number     // Auto-calculated: (final / raw) * 100
  cookingMethod?: string      // Optional: "roasted", "baked", "raw", etc.
}

export interface FinalDish {
  id: string
  name: string
  ingredients: Ingredient[]
  nutrientProfile: NutrientProfile  // Per 100g of FINAL weight
  
  // NEW FIELDS:
  rawTotalWeight: number
  finalCookedWeight: number
  yieldPercentage: number
  cookingMethod?: string
}
```

**2. Update Airtable Schema**

Add to both `SubRecipes` and `FinalDishes` tables:

| Field Name | Type | Description |
|------------|------|-------------|
| RawTotalWeight | Number | Auto-calculated sum of ingredient weights (grams) |
| FinalCookedWeight | Number | User-entered final weight after cooking (grams) |
| YieldPercentage | Number | Auto-calculated: (Final / Raw) × 100 |
| CookingMethod | Single select | "Raw", "Baked", "Roasted", "Fried", "Boiled", "Grilled", etc. |

**3. Enhanced Calculator Logic**

Update `/src/lib/calculator.ts`:

```typescript
/**
 * Calculate nutrient profile normalized to per 100g of FINAL cooked weight
 * 
 * @param ingredients - List of ingredients with quantities
 * @param finalCookedWeight - Actual weight after cooking (grams)
 * @returns NutrientProfile per 100g of final product
 */
export async function calculateNutrientProfile(
  ingredients: Ingredient[],
  finalCookedWeight: number,
  airtableService: any
): Promise<{
  nutrientProfile: NutrientProfile
  rawTotalWeight: number
  yieldPercentage: number
}> {
  
  // Step 1: Calculate total nutrients from all ingredients
  let totalNutrients = initializeNutrients()
  let rawTotalWeight = 0
  
  for (const ingredient of ingredients) {
    const { grams } = convertToGrams(ingredient.quantity, ingredient.unit, ingredient.usdaData)
    rawTotalWeight += grams
    
    // Fetch nutrient data (USDA or SubRecipe)
    const ingredientNutrients = await fetchNutrientData(ingredient, grams, airtableService)
    
    // Add to totals
    totalNutrients = addNutrients(totalNutrients, ingredientNutrients)
  }
  
  // Step 2: CRITICAL - Normalize to per 100g of FINAL weight (not raw)
  const nutrientProfile = normalizeToPerHundredGrams(totalNutrients, finalCookedWeight)
  
  // Step 3: Calculate yield percentage
  const yieldPercentage = (finalCookedWeight / rawTotalWeight) * 100
  
  return {
    nutrientProfile,
    rawTotalWeight,
    yieldPercentage
  }
}

/**
 * Normalize total nutrients to per 100g basis
 */
function normalizeToPerHundredGrams(
  totalNutrients: NutrientProfile,
  finalWeight: number
): NutrientProfile {
  const factor = 100 / finalWeight
  
  return {
    calories: totalNutrients.calories * factor,
    totalFat: totalNutrients.totalFat * factor,
    saturatedFat: totalNutrients.saturatedFat * factor,
    // ... all other nutrients
  }
}
```

**4. UI Implementation - Sub-Recipe Builder**

Add to `/src/app/sub-recipes/new/page.tsx`:

```typescript
// Form fields
const [ingredients, setIngredients] = useState<Ingredient[]>([])
const [finalCookedWeight, setFinalCookedWeight] = useState<number>(0)
const [cookingMethod, setCookingMethod] = useState<string>('raw')

// Auto-calculate raw total weight
const rawTotalWeight = useMemo(() => {
  return ingredients.reduce((sum, ing) => {
    const { grams } = convertToGrams(ing.quantity, ing.unit, ing.usdaData)
    return sum + grams
  }, 0)
}, [ingredients])

// Auto-calculate yield percentage
const yieldPercentage = useMemo(() => {
  if (!finalCookedWeight || !rawTotalWeight) return 0
  return Math.round((finalCookedWeight / rawTotalWeight) * 100)
}, [finalCookedWeight, rawTotalWeight])
```

**UI Section:**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
  <h3 className="font-semibold text-gray-800">Cooking Yield (Required for Accuracy)</h3>
  
  {/* Auto-calculated raw weight */}
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600">Total Raw Ingredients:</span>
    <span className="font-bold text-gray-800">{rawTotalWeight.toFixed(1)}g</span>
  </div>
  
  {/* Cooking method dropdown */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Cooking Method
    </label>
    <select
      value={cookingMethod}
      onChange={(e) => setCookingMethod(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
    >
      <option value="raw">Raw / No Cooking</option>
      <option value="baked">Baked</option>
      <option value="roasted">Roasted</option>
      <option value="grilled">Grilled</option>
      <option value="fried">Fried</option>
      <option value="boiled">Boiled</option>
      <option value="steamed">Steamed</option>
    </select>
  </div>
  
  {/* Final cooked weight input - REQUIRED */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Final Weight After Cooking (grams) *
      <span className="text-red-600 ml-1">Required</span>
    </label>
    <input
      type="number"
      required
      min="1"
      step="0.1"
      value={finalCookedWeight || ''}
      onChange={(e) => setFinalCookedWeight(parseFloat(e.target.value))}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
      placeholder="Enter actual weight after cooking"
    />
    <p className="text-xs text-gray-500 mt-1">
      Weigh the finished product to ensure accurate nutrition data
    </p>
  </div>
  
  {/* Yield indicator */}
  {finalCookedWeight > 0 && (
    <div className="bg-white rounded p-2 border border-gray-200">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Cooking Yield:</span>
        <span className={`font-bold ${
          yieldPercentage < 80 ? 'text-red-600' : 
          yieldPercentage > 120 ? 'text-blue-600' : 
          'text-green-600'
        }`}>
          {yieldPercentage}%
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {yieldPercentage < 100 && '⬇️ Weight decreased (moisture loss)'}
        {yieldPercentage > 100 && '⬆️ Weight increased (moisture gain)'}
        {yieldPercentage === 100 && '→ No weight change'}
      </p>
    </div>
  )}
  
  {/* Warning if raw === final for cooked foods */}
  {cookingMethod !== 'raw' && finalCookedWeight === rawTotalWeight && (
    <div className="bg-yellow-50 border border-yellow-300 rounded p-2">
      <p className="text-sm text-yellow-800">
        ⚠️ Are you sure the weight didn't change during cooking? 
        Most cooking methods cause moisture loss or gain.
      </p>
    </div>
  )}
</div>
```

**5. Smart Defaults Based on Cooking Method**

```typescript
// Suggest typical yield based on cooking method
const TYPICAL_YIELDS: Record<string, number> = {
  'raw': 100,
  'baked': 85,      // 15% moisture loss
  'roasted': 70,    // 30% moisture loss
  'grilled': 75,    // 25% moisture loss
  'fried': 90,      // 10% moisture loss
  'boiled': 100,    // No change (but can vary)
  'steamed': 95,    // 5% moisture loss
}

// Pre-fill suggestion when cooking method changes
useEffect(() => {
  if (cookingMethod && rawTotalWeight > 0 && !finalCookedWeight) {
    const suggestedWeight = rawTotalWeight * (TYPICAL_YIELDS[cookingMethod] / 100)
    // Show as placeholder, don't auto-fill
    setPlaceholderWeight(suggestedWeight)
  }
}, [cookingMethod, rawTotalWeight])
```

#### Implementation Checklist

- [ ] Add new fields to Airtable tables (RawTotalWeight, FinalCookedWeight, YieldPercentage, CookingMethod)
- [ ] Update TypeScript interfaces in `/src/types/nutrition.ts`
- [ ] Modify `calculateNutrientProfile()` to use final weight for normalization
- [ ] Add cooking yield section to Sub-Recipe builder UI
- [ ] Add cooking yield section to Final-Dish builder UI
- [ ] Implement yield percentage calculation and display
- [ ] Add validation: final weight must be > 0
- [ ] Create smart defaults based on cooking method
- [ ] Add warning for suspicious yields
- [ ] Update nutrition label to show "per 100g as prepared"
- [ ] Write unit tests for yield calculations
- [ ] Document cooking yield in user guide

#### Acceptance Criteria

✅ **Test Case 1: Roasted Vegetables**
- Raw ingredients: 1000g
- User enters final weight: 650g
- System calculates yield: 65%
- Nutrition normalized to 650g (not 1000g)
- Label shows accurate concentrated values

✅ **Test Case 2: Cooked Rice**
- Raw rice: 100g
- User enters final weight: 250g (absorbed water)
- System calculates yield: 250%
- Nutrition normalized to 250g (diluted)
- Label shows accurate diluted values

✅ **Test Case 3: Raw Salad**
- Raw ingredients: 500g
- User enters final weight: 500g
- Cooking method: "Raw"
- System accepts 100% yield
- No warning shown

✅ **Test Case 4: Validation**
- User tries to submit without final weight
- Form validation prevents submission
- Clear error message shown

---

## Risk 3: Opaque Data Structure in Airtable

### 🟡 Severity: MEDIUM
**Category:** Data Architecture / Future Scalability  
**Likelihood:** CERTAIN (By design)  
**Business Impact:** Limited queryability, difficult reporting, scaling challenges

### The Challenge

**Problem Statement:**  
Storing ingredient lists as stringified JSON in a single `IngredientsJSON` field creates several limitations:

1. **No Native Querying**
   - Cannot query "find all recipes using mayonnaise"
   - Cannot filter "show recipes with > 500 calories"
   - Cannot generate reports like "most-used ingredients"

2. **Data Integrity Risks**
   - Manual JSON editing could break structure
   - No foreign key constraints
   - Orphaned references (if USDA ingredient deleted)

3. **Difficult Maintenance**
   - Cannot bulk-update ingredient names
   - Cannot track ingredient version history
   - Cannot see which recipes use a SubRecipe before deleting

4. **Limited Airtable Features**
   - Cannot use Airtable's linked records
   - Cannot use rollup fields
   - Cannot use Airtable's built-in filtering

**Current Schema (Phase 1):**
```
SubRecipes Table:
┌─────────────────────────────────────────┐
│ Name: "Pizza Dough"                     │
│ IngredientsJSON: "[{...}, {...}]"       │  ← Opaque!
│ NutrientProfileJSON: "{...}"            │  ← Opaque!
│ ServingSizeGrams: 250                   │
└─────────────────────────────────────────┘
```

**Example Query Impossibility:**
```
WANT: "Show me all recipes that use 'All-Purpose Flour'"
REALITY: Must download ALL recipes, parse JSON client-side, filter manually
IMPACT: Slow, inefficient, doesn't scale
```

### Impact Assessment

| Impact Area | Consequence | Timeline |
|-------------|-------------|----------|
| **Query Performance** | Slow searches as data grows | 6+ months |
| **Reporting** | Cannot generate ingredient usage reports | Immediate |
| **Data Integrity** | Risk of JSON corruption | Ongoing |
| **Developer Experience** | Complex client-side filtering logic | Immediate |
| **User Features** | Cannot implement "recipes using X" | Phase 2+ |

### Acceptance of Trade-off

**For Phase 1 (Initial Launch):** This is an **acceptable trade-off** because:

✅ **Pros:**
- Simple implementation (matches CTO's original prompts)
- Fast to build and iterate
- Minimal Airtable record usage (important for free/paid tiers)
- Easier to version control (entire recipe in one record)
- Flexible schema (can add fields without migration)

⚠️ **Cons:**
- Limited querying (but not needed for MVP)
- No advanced filtering (but not a launch requirement)
- Harder to scale (but acceptable for <1000 recipes)

**Decision:** Proceed with JSON fields for Phase 1, plan for Phase 2 normalization.

### Phase 2: Normalized Data Structure

**When to Migrate:** After launch, when any of these triggers occur:
- More than 500 recipes in database
- User requests "find recipes with X ingredient"
- Need for advanced reporting/analytics
- Airtable performance degrades
- Multiple users collaborating on recipes

#### Proposed Normalized Schema

**Phase 2 Table Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│ RECIPES (formerly SubRecipes + FinalDishes)                 │
├─────────────────────────────────────────────────────────────┤
│ RecipeID (Auto)                                             │
│ Name (Single line text)                                     │
│ RecipeType (Single select: "SubRecipe" | "FinalDish")      │
│ ServingSizeGrams (Number)                                   │
│ RawTotalWeight (Number)                                     │
│ FinalCookedWeight (Number)                                  │
│ YieldPercentage (Number)                                    │
│ CookingMethod (Single select)                               │
│ CreatedAt (Created time)                                    │
│ UpdatedAt (Last modified time)                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Has many...
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ RECIPE_INGREDIENTS (Junction table)                         │
├─────────────────────────────────────────────────────────────┤
│ IngredientID (Auto)                                         │
│ RecipeID (Link to RECIPES)                                  │
│ IngredientType (Single select: "USDA" | "SubRecipe")       │
│ USDAFoodID (Link to USDA_FOODS) - if USDA                  │
│ SubRecipeID (Link to RECIPES) - if SubRecipe               │
│ Quantity (Number)                                           │
│ Unit (Single line text)                                     │
│ GramsCalculated (Formula: auto-calculate using conversion) │
│ SortOrder (Number: for display order)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Links to...
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ USDA_FOODS (formerly USDACache)                             │
├─────────────────────────────────────────────────────────────┤
│ FdcID (Number - Primary Key)                                │
│ Name (Single line text)                                     │
│ NutrientProfileJSON (Long text) - Keep for performance     │
│ CustomConversionJSON (Long text)                            │
│ LastUpdated (Last modified time)                            │
│ UsageCount (Rollup: count of RECIPE_INGREDIENTS)           │
└─────────────────────────────────────────────────────────────┘
```

**Benefits of Normalized Structure:**

1. **Native Airtable Queries**
   ```
   Find all recipes using "All-Purpose Flour":
   → Filter RECIPE_INGREDIENTS where USDAFoodID = <flour_id>
   → Rollup to get linked RECIPES
   ```

2. **Data Integrity**
   - Foreign key constraints via linked records
   - Cannot delete ingredient used in recipes (Airtable prevents)
   - Automatic orphan detection

3. **Advanced Features**
   ```
   - Most-used ingredients (rollup UsageCount)
   - Bulk rename ingredients (update one USDA_FOODS record)
   - Recipe dependency graph (which SubRecipes use which SubRecipes)
   - Ingredient substitution (swap links, nutrition recalculates)
   ```

4. **Better UX**
   - "Recipes using this ingredient" shown on ingredient page
   - "Delete warning: used in 5 recipes"
   - Auto-complete ingredients from existing library

#### Migration Strategy (Future Phase 2)

**Step-by-step migration plan:**

1. **Create new tables** (RECIPES, RECIPE_INGREDIENTS, USDA_FOODS)
2. **Export existing data** from Phase 1 tables
3. **Parse JSON** to extract ingredients
4. **Populate new tables** with normalized data
5. **Verify data integrity** (checksums, spot checks)
6. **Update application code** to use new schema
7. **Run in parallel** (dual-write for safety)
8. **Switch cutover** once validated
9. **Archive old tables** (keep for rollback)

**Code Changes Required:**
- `/src/lib/airtable-nutrition.ts` - New query patterns
- `/src/lib/calculator.ts` - Fetch ingredients from junction table
- `/src/components/*` - Update forms to save individual ingredient records
- API routes - Update to handle new schema

**Estimated Migration Effort:** 2-3 weeks for 500 recipes

#### Temporary Workarounds (Phase 1)

Until Phase 2 migration, implement these client-side utilities:

```typescript
// /src/lib/recipe-search.ts

/**
 * Client-side search for recipes containing specific ingredient
 * WARNING: Not performant for large datasets (>500 recipes)
 */
export function findRecipesWithIngredient(
  recipes: SubRecipe[],
  searchFdcId: number
): SubRecipe[] {
  return recipes.filter(recipe => {
    return recipe.ingredients.some(ing => ing.fdcId === searchFdcId)
  })
}

/**
 * Generate ingredient usage report
 */
export function getIngredientUsageReport(
  recipes: SubRecipe[]
): Map<number, { name: string; count: number; recipes: string[] }> {
  const usage = new Map()
  
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ing => {
      if (ing.fdcId) {
        const existing = usage.get(ing.fdcId) || { 
          name: ing.name, 
          count: 0, 
          recipes: [] 
        }
        existing.count++
        existing.recipes.push(recipe.name)
        usage.set(ing.fdcId, existing)
      }
    })
  })
  
  return usage
}
```

#### Implementation Checklist (Phase 1 - Awareness Only)

- [ ] ✅ Accept JSON structure for Phase 1
- [ ] 📝 Document Phase 2 normalized schema (this section)
- [ ] 📝 Add TODO comments in code flagging migration points
- [ ] 🔄 Design API responses to be migration-friendly
- [ ] 📊 Track recipe count to trigger Phase 2 planning
- [ ] 🧪 Build client-side search utilities as temporary solution

#### Acceptance Criteria (Phase 1)

✅ **Acknowledge Limitation**
- Documentation clearly states "limited querying in Phase 1"
- User guide explains to use search/filter on recipe names only
- Phase 2 plan documented and approved

✅ **Mitigation in Place**
- Client-side utilities available for basic ingredient search
- Performance acceptable for <500 recipes
- No data corruption from JSON fields

✅ **Migration Path Clear**
- Detailed Phase 2 schema documented
- Migration strategy outlined
- Effort estimated

✅ **Decision Point Defined**
- Triggers for Phase 2 migration identified
- Cost/benefit analysis completed
- Stakeholders informed

---

## Additional Risks Identified During Audit

### Risk 4: USDA API Rate Limiting

**Challenge:** USDA API has rate limits (unknown exact limit, likely 1000 requests/hour)

**Mitigation:**
- Aggressive caching in `USDACache` table
- Check cache BEFORE calling API
- Implement exponential backoff on rate limit errors
- Show user-friendly message: "USDA API busy, try again in 5 minutes"
- Consider batch import for common ingredients on initial setup

### Risk 5: Missing Nutrient Data

**Challenge:** Not all USDA foods have complete nutrient profiles (some missing vitamins, minerals)

**Mitigation:**
- Default missing nutrients to 0 (with asterisk on label)
- Add footnote: "*Not available in USDA data"
- Allow manual entry of missing nutrients (future enhancement)
- Prioritize "Foundation Foods" over "Branded" (more complete data)

### Risk 6: Concurrent Edits (Multi-User)

**Challenge:** Two users editing same recipe simultaneously could overwrite changes

**Mitigation:**
- Phase 1: Single-user assumption (password gate limits access)
- Phase 2: Implement optimistic locking (check modified timestamp before update)
- Future: Real-time collaboration with WebSockets

### Risk 7: Recipe Deletion Cascade

**Challenge:** Deleting a SubRecipe that's used in FinalDishes breaks references

**Mitigation:**
- Before delete: Check if SubRecipe is referenced in any FinalDish
- Show warning: "Used in 3 final dishes. Delete anyway?"
- Soft delete option (mark as archived, don't delete)
- Phase 2: Foreign key constraints via normalized schema prevent deletion

---

## Risk Monitoring Dashboard (Post-Launch)

Track these metrics to identify risks becoming reality:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Conversion confidence = "unknown" | > 10% of ingredients | Add more custom conversions |
| Yield variance | > 50% deviation from typical | Investigate user confusion |
| Recipe count | > 500 | Plan Phase 2 migration |
| USDA API errors | > 5% of requests | Investigate rate limiting |
| Missing nutrient data | > 20% of nutrients | Switch to Foundation Foods |

---

## Conclusion

All three identified risks have **concrete, actionable mitigation strategies** that will be implemented during Phase 1:

1. ✅ **Unit Conversion** - User-defined custom conversions with 4-tier priority system
2. ✅ **Cooking Yields** - Mandatory final weight input with smart defaults
3. ✅ **Data Structure** - Acknowledged trade-off with clear Phase 2 migration path

By building these safeguards from day one, we ensure the application launches with:
- **Accurate** nutrition data
- **Trustworthy** calculations
- **Scalable** architecture (with clear upgrade path)

---

**Document Status:** ✅ Ready for Implementation  
**Next Step:** Begin Phase 1 implementation with all mitigations included  
**Approval Required:** CEO sign-off on Phase 2 migration triggers

**Last Updated:** October 22, 2025
