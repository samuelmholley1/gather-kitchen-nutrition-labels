# Airtable Schema Requirements for FinalDishes

## Required Fields Check

When creating a Final Dish, the API expects these Airtable fields to exist:

### Mandatory Fields (must exist)
- `Name` (Single Line Text) - Recipe name
- `Components` (Long Text) - JSON string of ingredients
- `TotalWeight` (Number) - Total recipe weight in grams
- `ServingSize` (Number) - Serving size in grams
- `ServingsPerContainer` (Number) - How many servings
- `NutritionLabel` (Long Text) - JSON string of nutrition data
- `Category` (Single Line Text or Single Select)
- `Notes` (Long Text)
- `Status` (Single Line Text or Single Select)
- `CreatedAt` (Date/DateTime)
- `UpdatedAt` (Date/DateTime)

### Optional Fields (conditional)
- `SubRecipeLinks` (Link to SubRecipes table) - Only if linking to sub-recipes
- `Allergens` (Multiple Select or Long Text) - Only if allergens present

## Common Errors

### 1. "UNKNOWN_FIELD_NAME"
**Cause**: Field doesn't exist in Airtable
**Fix**: Create the missing field in Airtable or update the code to match existing field names

### 2. "INVALID_VALUE_FOR_COLUMN"
**Cause**: Wrong data type (e.g., sending text to a number field)
**Fix**: Check field types in Airtable match what we're sending

### 3. "INVALID_REQUEST_BODY"
**Cause**: Malformed JSON or incorrect field structure
**Fix**: Check that JSON fields (Components, NutritionLabel) are valid JSON strings

### 4. Empty Array Error
**Cause**: Sending empty arrays to fields that don't accept them
**Fix**: Code now only sends SubRecipeLinks and Allergens if they have values

## Debugging Steps

1. **Check Vercel Logs**: 
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for "Creating final dish with fields:" to see what data is being sent
   - Look for "Full error object:" to see Airtable's error response

2. **Verify Airtable Field Names**:
   - Open your FinalDishes table in Airtable
   - Click on any column header
   - Ensure field names EXACTLY match (case-sensitive): Name, Components, TotalWeight, etc.

3. **Check Field Types**:
   - Components: Should be "Long text" type (can hold JSON)
   - NutritionLabel: Should be "Long text" type
   - TotalWeight, ServingSize, ServingsPerContainer: Should be "Number" type
   - Status: If Single Select, must have "active" as an option
   - SubRecipeLinks: Should be "Link to another record" → SubRecipes table

4. **Try Manually Creating a Record**:
   - In Airtable, try creating a FinalDish record manually
   - See which fields are marked as required (red asterisk)
   - Make sure our code is providing all required fields

## Quick Fix: Minimal Working Schema

If you want to get it working quickly, create these fields in Airtable:

```
Name: Single line text (required)
Components: Long text
TotalWeight: Number
ServingSize: Number
ServingsPerContainer: Number
NutritionLabel: Long text
Category: Single line text
Notes: Long text
Status: Single line text
CreatedAt: Date
UpdatedAt: Date
```

Optional (only if using sub-recipes):
```
SubRecipeLinks: Link to another record → SubRecipes
```
