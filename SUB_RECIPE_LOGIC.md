# Sub-Recipe Detection Logic

## Overview

The smart parser automatically detects **sub-recipes** (recipes within recipes) using parentheses. But how does it know the difference between a sub-recipe and just a description in parentheses?

## The Key Pattern

**Sub-recipes are detected when:**
1. The line follows this pattern: `[quantity] [unit] [name] (ingredient list)`
2. The content inside parentheses is analyzed for ingredient signals vs descriptor signals

### Intelligent Content Analysis (NEW!)

The parser now **intelligently analyzes** what's inside the parentheses to distinguish between:
- **Ingredient lists** → Create sub-recipe
- **Descriptive attributes** → Treat as regular ingredient

**Ingredient Signals (suggests sub-recipe):**
- Contains numbers/quantities: `1 tomato`, `2 cups`
- Contains measurement units: `cup`, `tbsp`, `oz`
- Contains common food nouns: `tomatoes`, `onions`, `garlic`, `basil`, `carrots`, `celery`
- Supports both singular and plural: `tomato/tomatoes`, `carrot/carrots`

**Descriptor Signals (suggests NOT sub-recipe):**
- Cooking descriptors: `boneless`, `skinless`, `diced`, `chopped`, `fresh`, `organic`
- Body part nouns: `breast`, `thigh`, `wing`, `leg`
- Preparation states: `cooked`, `raw`, `dried`, `frozen`
- Single short adjectives without food context

**Decision Logic:**
1. If descriptors outnumber ingredients → Regular ingredient (not sub-recipe)
2. If fewer than 2 ingredient-like items → Regular ingredient (not sub-recipe)
3. Otherwise → Sub-recipe

## Detection Regex

```regex
/^\s*([\d\s\/\.]+)?\s*([a-zA-Z]+)?\s+([^(]+)\s*\(([^)]+)\)\s*$/
```

Breaking it down:
- `([\d\s\/\.]+)?` - Optional quantity (numbers, fractions, decimals)
- `([a-zA-Z]+)?` - Optional unit (cup, tbsp, etc.)
- `([^(]+)` - Sub-recipe name (everything before the opening parenthesis)
- `\(([^)]+)\)` - Content inside parentheses (the ingredient list)
- Must match the **entire line** (anchored with `^` and `$`)

## Examples

### ✅ Detected as Sub-Recipes

```
1 cup salsa verde (1 tomato, 1 jalapeño, cilantro)
```
**Why:** Full pattern match + multiple ingredients in parentheses
**Result:** Creates separate sub-recipe "salsa verde" with 3 ingredients

```
2 tablespoons pesto (basil, garlic, olive oil, parmesan)
```
**Why:** Full pattern match + comma-separated ingredients
**Result:** Creates sub-recipe "pesto" with 4 ingredients

```
Marinade (soy sauce, ginger, sesame oil)
```
**Why:** Full pattern match (quantity defaults to 1, unit to "item")
**Result:** Creates sub-recipe "Marinade" with 3 ingredients

### ❌ NOT Detected as Sub-Recipes (Treated as Regular Ingredients)

```
1 red bell pepper (peddled)
```
**Why:** Only ONE word in parentheses (descriptor)
**Result:** Regular ingredient, parentheses content ignored/removed by USDA search

```
chicken (boneless, skinless breast)
```
**Why:** All items are descriptors (boneless, skinless, breast), no ingredient signals
**Result:** Regular ingredient - "chicken" with descriptive attributes

```
1 pound chicken (boneless, skinless, breast)
```
**Why:** 3 descriptor words, 0 ingredient signals
**Result:** Regular ingredient

```
boneless skinless chicken breast (about 6 oz)
```
**Why:** Single phrase in parentheses, no comma-separated list
**Result:** Regular ingredient with note

```
4 tomatoes (fresh, organic, diced)
```
**Why:** All items are descriptors (fresh=state, organic=quality, diced=prep)
**Result:** Regular ingredient

```
olive oil (for frying)
```
**Why:** Just an instruction note, not ingredient list
**Result:** Regular ingredient

```
Some text before 1 cup sauce (ingredient)
```
**Why:** Doesn't start with quantity/unit/name pattern
**Result:** Fails regex match, treated as regular line

## How Single-Word Parentheses Are Handled

When parentheses contain just ONE word or phrase (no commas):

1. **Parser:** Treats it as a regular ingredient
2. **USDA Search Cleaning:** Removes parentheses and their contents
   ```typescript
   .replace(/\([^)]*\)/g, '')  // Remove (parentheses)
   ```
3. **Result:** `"red bell pepper (peddled)"` → searches for `"red bell pepper"`

## Sub-Recipe Creation Process

When a sub-recipe IS detected:

### Step 1: Extract Information
```
Input: "1 cup salsa verde (1 tomato, 1 jalapeño, cilantro)"

Extracted:
- quantity: 1
- unit: "cup"
- subRecipeName: "salsa verde"
- subRecipeIngredients: "1 tomato, 1 jalapeño, cilantro"
```

### Step 2: Parse Sub-Recipe Ingredients
The ingredient list inside parentheses is split by commas and each is parsed:
```
"1 tomato" → {quantity: 1, unit: "item", ingredient: "tomato"}
"1 jalapeño" → {quantity: 1, unit: "item", ingredient: "jalapeño"}  
"cilantro" → {quantity: 1, unit: "item", ingredient: "cilantro"}
```

### Step 3: Save to Database
1. **SubRecipe saved first** with its ingredients
2. **Total weight calculated** from ingredient USDA data
3. **Final dish references** the sub-recipe by ID

### Step 4: Intelligent Scaling
When the final dish uses "1 cup salsa verde":
1. Sub-recipe total weight: e.g., 237g (from summing ingredients)
2. Requested amount: 1 cup = ~237g (volume conversion)
3. Scaling ratio: 237g / 237g = 1.0 (or whatever the ratio is)
4. Nutrition scaled accordingly

## Edge Cases

### Empty Parentheses
```
salsa verde ()
```
**Result:** ❌ Error - "Sub-recipes must have ingredients listed inside parentheses"

### Nested Parentheses
```
sauce (tomatoes (crushed), garlic)
```
**Result:** ⚠️ Warning - "Only the outermost level is supported"
**Behavior:** Treats inner parentheses as regular text

### Unbalanced Parentheses
```
1 cup sauce (tomatoes, garlic
```
**Result:** ❌ Error - "Unbalanced parentheses"

### No Comma in Parentheses
```
1 cup sauce (homemade)
```
**Result:** Regular ingredient (single word treated as note, not ingredient list)

## Why This Design?

### Intelligent Content Analysis
The presence of commas is no longer the sole indicator. The parser now **analyzes each comma-separated item** to determine if it's:

- ✅ **Ingredient-like**: `tomato`, `1 cup water`, `garlic`, `carrots`
- ❌ **Descriptor-like**: `boneless`, `skinless`, `breast`, `fresh`, `diced`

This prevents false positives like:
- `chicken (boneless, skinless breast)` - All descriptors → Regular ingredient ✅
- `tomatoes (fresh, organic, diced)` - All descriptors → Regular ingredient ✅
- `salsa (tomato, onion, cilantro)` - All food nouns → Sub-recipe ✅

### Pattern Matching
The regex ensures the ENTIRE line follows the expected format. This prevents false positives like:
- `"Note: use 1 cup (homemade or store-bought)"` - Wouldn't match
- `"chicken breast (see notes) with marinade"` - Wouldn't match

## When to Use Sub-Recipes

### ✅ Good Use Cases
```
1 cup marinara sauce (tomatoes, garlic, basil, olive oil)
2 tablespoons taco seasoning (cumin, chili powder, paprika, salt)
Pie crust (flour, butter, water, salt)
```

### ❌ Don't Use Sub-Recipes For
```
1 chicken breast (boneless, skinless) - Use: "1 boneless skinless chicken breast"
2 cups rice (cooked) - Use: "2 cups cooked rice"
1 onion (diced) - Use: "1 diced onion" or just "1 onion"
```

## Summary

**The app knows it's a sub-recipe when:**
1. ✅ Line matches the pattern: `[qty] [unit] [name] (ingredients)`
2. ✅ Parentheses content is analyzed and contains **ingredient-like items**
   - Has numbers/units: `1 tomato`, `2 cups basil`
   - Has food nouns without descriptors: `carrots`, `onions`, `garlic`
3. ✅ Descriptor count doesn't exceed ingredient count

**Otherwise, parentheses are treated as:**
- Notes/descriptions that get removed during USDA search
- Regular text that doesn't create a sub-recipe

**Descriptive parentheses like `(boneless, skinless breast)` are:**
- Analyzed and recognized as descriptors (not ingredients)
- NOT created as sub-recipes ✅
- Removed during USDA search cleaning
- Just descriptive text that doesn't affect the nutrition calculation

**Real food names like `(carrots, celery, onions)` are:**
- Analyzed and recognized as food ingredients
- Created as sub-recipes ✅
- Each ingredient gets USDA matching
- Proper nutrition calculation with scaling

This design ensures that **only actual sub-recipes with multiple ingredients** create separate entries in the database, while descriptive attributes like "boneless, skinless breast" are handled gracefully as regular ingredients without creating unnecessary complexity.
