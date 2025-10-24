# Ingredient Specification Implementation Plan

## Problem Statement
When users enter countable ingredients like "4 tomatoes", the parser needs to prompt for size/variety specification before USDA matching to ensure accurate nutrition data.

## Solution: Option A - Pre-Match Prompt

### Phase 1: Build Unit Classification System

**File: `src/lib/ingredientTaxonomy.ts`** (NEW)

```typescript
export const MEASUREMENT_UNITS = {
  volume: ['cup', 'tablespoon', 'tbsp', 'teaspoon', 'tsp', 'liter', 'ml', 'gallon', 'quart', 'pint'],
  weight: ['pound', 'lb', 'ounce', 'oz', 'gram', 'g', 'kilogram', 'kg'],
  other: ['pinch', 'dash', 'splash', 'handful']
}

export const COUNT_UNITS = ['item', 'piece', 'slice', 'clove', 'sprig', 'leaf', 'stalk', 'head', 'bunch']

export const INGREDIENT_UNITS = {
  highVariation: [
    { name: 'tomato', varieties: ['cherry', 'roma', 'medium', 'beefsteak', 'heirloom'] },
    { name: 'potato', varieties: ['small', 'medium', 'large', 'russet', 'red', 'fingerling'] },
    { name: 'onion', varieties: ['small', 'medium', 'large', 'pearl', 'shallot'] },
    { name: 'apple', varieties: ['small', 'medium', 'large', 'granny smith', 'fuji', 'honeycrisp'] },
    { name: 'pepper', varieties: ['bell', 'jalapeño', 'serrano', 'poblano'] },
    { name: 'carrot', varieties: ['baby', 'medium', 'large'] }
  ],
  standardSize: ['egg', 'avocado', 'lemon', 'lime'],
  meats: ['chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb']
}

export function isMeasurementUnit(unit: string): boolean {
  const allMeasurements = [
    ...MEASUREMENT_UNITS.volume,
    ...MEASUREMENT_UNITS.weight,
    ...MEASUREMENT_UNITS.other
  ]
  return allMeasurements.some(u => unit.toLowerCase().includes(u))
}

export function isCountUnit(unit: string): boolean {
  return COUNT_UNITS.some(u => unit.toLowerCase() === u)
}

export function isIngredientUnit(unit: string): { 
  isIngredient: boolean
  needsSpec: boolean
  varieties?: string[]
} {
  const normalized = unit.toLowerCase().replace(/s$/, '') // Remove plural
  
  // Check high variation ingredients
  const highVar = INGREDIENT_UNITS.highVariation.find(i => 
    normalized === i.name || normalized === i.name + 's'
  )
  if (highVar) {
    return { isIngredient: true, needsSpec: true, varieties: highVar.varieties }
  }
  
  // Check standard size
  if (INGREDIENT_UNITS.standardSize.includes(normalized)) {
    return { isIngredient: true, needsSpec: false }
  }
  
  // Check meats
  if (INGREDIENT_UNITS.meats.includes(normalized)) {
    return { isIngredient: true, needsSpec: false }
  }
  
  return { isIngredient: false, needsSpec: false }
}
```

### Phase 2: Update Parser to Flag Ingredients Needing Specification

**File: `src/lib/smartRecipeParser.ts`**

Add to ParsedIngredient interface:
```typescript
export interface ParsedIngredient {
  // ... existing fields
  needsSpecification?: boolean
  specificationPrompt?: string
  specificationOptions?: string[]
  baseIngredient?: string
}
```

In `parseSmartRecipe()`, after parsing each ingredient:
```typescript
// Check if unit is an ingredient that needs specification
const ingredientCheck = isIngredientUnit(parsed.unit)
if (ingredientCheck.isIngredient && ingredientCheck.needsSpec) {
  ingredients.push({
    ...parsed,
    needsSpecification: true,
    baseIngredient: parsed.unit,
    specificationPrompt: `What type/size of ${parsed.unit}?`,
    specificationOptions: ingredientCheck.varieties
  })
} else {
  ingredients.push(parsed)
}
```

### Phase 3: Add Pre-Match Prompt UI Component

**File: `src/components/IngredientSpecificationModal.tsx`** (NEW)

```typescript
interface Props {
  ingredient: ParsedIngredient
  onSpecify: (variety: string) => void
  onSkip: () => void
}

export function IngredientSpecificationModal({ ingredient, onSpecify, onSkip }: Props) {
  return (
    <div className="modal">
      <h3>Specify {ingredient.baseIngredient}</h3>
      <p>You have {ingredient.quantity} {ingredient.baseIngredient}. What type/size?</p>
      <div className="options">
        {ingredient.specificationOptions?.map(variety => (
          <button key={variety} onClick={() => onSpecify(variety)}>
            {variety}
          </button>
        ))}
      </div>
      <button onClick={onSkip}>Skip (use default)</button>
    </div>
  )
}
```

**File: `src/app/page.tsx`** (UPDATE)

Before USDA matching loop:
```typescript
// Check for ingredients needing specification
const needsSpec = parsedRecipe.ingredients.filter(ing => ing.needsSpecification)
if (needsSpec.length > 0) {
  // Show modal for each ingredient
  for (const ing of needsSpec) {
    const variety = await promptForVariety(ing) // Shows modal, waits for user input
    if (variety) {
      // Update ingredient name to include variety
      ing.ingredient = `${variety} ${ing.ingredient}`
      ing.needsSpecification = false
    }
  }
}

// Proceed with USDA matching
```

### Phase 4: Pass Variety Context to USDA Search

**File: `src/app/page.tsx`** (UPDATE)

When calling USDA API:
```typescript
const searchQuery = ingredient.needsSpecification
  ? `medium ${ingredient.ingredient}` // Default to medium if skipped
  : ingredient.ingredient

const usdaVariants = await fetch(`/api/usda/search?query=${searchQuery}`)
```

## Implementation Order

1. ✅ Create `src/lib/ingredientTaxonomy.ts`
2. ✅ Update `ParsedIngredient` interface in `smartRecipeParser.ts`
3. ✅ Add specification detection in parser
4. ✅ Create `IngredientSpecificationModal.tsx` component
5. ✅ Integrate modal into main page flow
6. ✅ Update USDA search to use variety context
7. ✅ Test with various ingredient types
8. ✅ Add ability to save user preferences (e.g., "always use medium tomatoes")

## Testing Checklist

- [ ] "4 tomatoes" → prompts for variety
- [ ] "1 cup tomatoes" → no prompt (already measured)
- [ ] "2 eggs" → no prompt (standard size)
- [ ] "3 large potatoes" → no prompt (size already specified)
- [ ] Skip button → defaults to "medium"
- [ ] Variety selection → updates USDA search query
- [ ] Modal appears before USDA matching starts

---

## Part 2: Regular Ingredient Validation

### Implemented ✅

**File: `src/lib/smartRecipeParser.ts`**

Added validation for regular ingredients (not just sub-recipes):

1. **CRITICAL ERROR**: Ingredient with no quantity
   - Blocks parsing with clear error message
   - Example: "chicken breast" → Error: needs quantity

2. **WARNING**: Vague or non-standard units
   - Allows parsing but warns user
   - Vague units: "some", "a little", "a bit", "bunch", "handful", "splash"
   - Example: "some flour" → Warning: use precise measurements

3. **WARNING**: Missing unit (defaulted to "item")
   - Warns when unit was inferred
   - Example: "2 chicken" → Warning: consider adding unit

### Validation Logic

```typescript
// Block ingredients with no quantity
if (!parsed.quantity || parsed.quantity === 0 || isNaN(parsed.quantity)) {
  errors.push(`❌ Error: Ingredient "${parsed.ingredient}" has no quantity. Please add a number.`)
  continue
}

// Warn about vague units
const vagueUnits = ['some', 'a little', 'a bit', 'bunch', 'handful', 'splash']
if (vagueUnits.includes(parsed.unit.toLowerCase())) {
  errors.push(`⚠️ Warning: Ingredient "${parsed.ingredient}" uses vague unit "${parsed.unit}".`)
}

// Warn about missing units
if (parsed.unit === 'item' && !line.toLowerCase().includes('item')) {
  errors.push(`⚠️ Warning: "${parsed.ingredient}" has no unit specified.`)
}
```

---

## Part 3: /api/final-dishes 500 Error Fix

### Implemented ✅

**File: `src/app/api/final-dishes/route.ts`**

Enhanced error handling and logging:

1. **Conditional Array Fields**
   - Only set SubRecipeLinks and Allergens if they have values
   - Some Airtable fields may not accept empty arrays

2. **Detailed Logging**
   - Console log all fields before creation
   - Log full error details (name, message, stack)
   - Helps debug Airtable schema mismatches

3. **Better Error Messages**
   - Detect Airtable-specific errors (INVALID_REQUEST_BODY, AUTHENTICATION_REQUIRED)
   - Return detailed error info in development mode
   - Include error name, message, and stack trace

### Changes Made

```typescript
// Prepare fields with validation
const fields: any = {
  Name: name,
  Components: JSON.stringify(components),
  // ... other required fields
}

// Only add arrays if they have values
if (subRecipeLinks && subRecipeLinks.length > 0) {
  fields.SubRecipeLinks = subRecipeLinks
}
if (allergens && allergens.length > 0) {
  fields.Allergens = allergens
}

console.log('Creating final dish with fields:', JSON.stringify(fields, null, 2))

// Enhanced error handling with Airtable-specific messages
catch (error) {
  console.error('Full error details:', error)
  // Return detailed error info for debugging
}
```

### Next Steps for Debugging

If error persists after these changes:

1. Check dev server console for detailed field dump
2. Verify Airtable schema matches expected fields
3. Check if SubRecipeLinks/Allergens are correct field types in Airtable
4. Ensure AIRTABLE_FINALDISHES_TABLE env variable is correct
5. Verify API token has write permissions
