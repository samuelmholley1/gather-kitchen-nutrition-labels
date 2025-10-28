# Editable Fields in View/Edit Calculations Modal

## Overview
The CalculationProvenanceModal now supports inline editing of both ingredient-level and final nutrition totals with full audit trail tracking - **without requiring any Airtable schema changes**.

## What's Editable? ✏️

### 1. **Ingredient Quantities & Units** (Per Row)
- **Location**: Each ingredient row has a pencil icon next to the quantity/unit
- **Editable Fields**:
  - Quantity (numeric value)
  - Unit (text, e.g., "g", "large", "cups")
- **How It Works**:
  - Click pencil icon → inline edit mode appears
  - Modify quantity/unit → click ✓ to save or ✕ to cancel
  - Auto-saves with edit reason in Components JSON field
  - Page refreshes to show recalculated nutrition

### 2. **Final Nutrition Totals** (Bottom Row)
- **Location**: Final "FINAL DISH TOTAL" row has pencil icon next to totals
- **Editable Fields**:
  - Calories (kcal)
  - Carbohydrates (g)
  - Protein (g)
  - Fat (g)
- **How It Works**:
  - Click pencil icon → edit form appears
  - Modify any/all nutrition values
  - **Required**: Enter reason for manual edit
  - Click "Save Changes" → updates NutritionProfile with audit trail
  - Page refreshes to show updated label

## Audit Trail & Tracking 📊

### Ingredient Edits
**Stored in**: `Components` JSON field (already exists in Airtable)

```json
{
  "id": "comp_123",
  "type": "ingredient",
  "name": "eggs",
  "quantity": 12,
  "unit": "large",
  "fdcId": 747997,
  "editHistory": [
    {
      "timestamp": "2025-10-27T10:30:00.000Z",
      "editedBy": "User",
      "previousQuantity": 12,
      "previousUnit": "large",
      "newQuantity": 10,
      "newUnit": "large",
      "reason": "Updated eggs from 12large to 10large"
    }
  ]
}
```

### Final Total Edits
**Stored in**: `NutritionProfile` JSON field (already exists in Airtable)

Uses existing audit trail system:
```json
{
  "values": {
    "kcal": 210,
    "carbs": 47,
    "protein": 6,
    "fat": 0
  },
  "calculatedValues": {
    "kcal": 191,
    "carbs": 47,
    "protein": 6,
    "fat": 0
  },
  "source": "manual_override",
  "lastCalculated": "2025-10-27T10:30:00.000Z",
  "manualEditMetadata": {
    "timestamp": "2025-10-27T10:35:00.000Z",
    "editedBy": "User",
    "reason": "Adjusted calories to match lab results",
    "editedFields": ["calories"],
    "previousValues": {
      "calories": 191
    }
  }
}
```

## Technical Implementation 🔧

### API Endpoints

#### 1. Update Component (Ingredient Edit)
**Route**: `POST /api/final-dishes/[id]/update-component`

**Request**:
```json
{
  "componentIndex": 0,
  "quantity": 10,
  "unit": "large",
  "reason": "Updated quantity"
}
```

**What It Does**:
- Fetches Components array from Airtable
- Adds edit to `editHistory[]` array in the component
- Updates quantity/unit
- Saves back to Airtable (same JSON field)
- **No schema changes needed**

#### 2. Manual Override (Total Edit)
**Route**: `POST /api/final-dishes/[id]/manual-override`

**Request**:
```json
{
  "overrides": {
    "calories": "210",
    "totalCarbohydrate": "47",
    "protein": "6",
    "totalFat": "0"
  },
  "reason": "Lab results correction"
}
```

**What It Does**:
- Uses existing `applyManualOverride()` helper
- Updates NutritionProfile with audit trail metadata
- Saves to existing JSON field
- **No schema changes needed**

## User Experience Flow 🎯

### Editing Ingredient Quantity
1. User clicks pencil icon next to "12 large" eggs
2. Inline form appears with:
   - Quantity input: `12`
   - Unit input: `large`
   - ✓ Save button
   - ✕ Cancel button
3. User changes to `10`, clicks ✓
4. System saves edit with auto-generated reason
5. Page refreshes → all calculations update automatically

### Editing Final Totals
1. User clicks pencil icon next to final nutrition values
2. Edit form appears with all 4 fields (kcal, carbs, protein, fat)
3. User modifies values
4. **Required**: User enters reason (e.g., "Lab results")
5. User clicks "Save Changes"
6. System applies manual override with full audit trail
7. Page refreshes → label shows new values
8. Discrepancy warning appears comparing calculated vs manual

## Key Features ✨

### 1. **Zero Schema Changes**
- All data stored in existing JSON fields
- `Components` field stores ingredient edit history
- `NutritionProfile` field stores manual override metadata
- Backwards compatible with existing records

### 2. **Full Audit Trail**
- Every edit tracked with:
  - Timestamp (when)
  - Editor (who - can be enhanced with auth)
  - Reason (why)
  - Previous values (what changed from)
  - New values (what changed to)

### 3. **Smart Recalculation**
- Ingredient edits trigger full recalculation
- Final total edits preserve calculated values for comparison
- Discrepancy warnings when manual ≠ calculated

### 4. **Inline Editing UX**
- Pencil icons clearly indicate editable fields
- Inline forms minimize context switching
- Save/Cancel buttons for explicit control
- Auto-refresh shows results immediately

## Example Scenarios 📝

### Scenario 1: Fix Ingredient Quantity
**Problem**: Recipe says "12 large eggs" but should be "10 large eggs"

**Steps**:
1. Open View/Edit Calculations modal
2. Click pencil icon next to "12 large" in eggs row
3. Change quantity to `10`
4. Click ✓
5. Modal refreshes with updated calculations

**Result**: All downstream calculations update automatically

---

### Scenario 2: Manual Lab Override
**Problem**: Lab analysis shows 210 kcal but calculation shows 191 kcal

**Steps**:
1. Open View/Edit Calculations modal
2. Scroll to FINAL DISH TOTAL row
3. Click pencil icon next to nutrition values
4. Change kcal from `191` to `210`
5. Enter reason: "Lab analysis results"
6. Click "Save Changes"

**Result**: 
- Label shows 210 kcal
- Audit trail records the override
- Yellow warning box shows discrepancy
- Option to revert to calculated values available

---

### Scenario 3: Review Edit History
**Problem**: Need to see why nutrition values differ

**Steps**:
1. Open View/Edit Calculations modal
2. Yellow warning box appears (if discrepancy exists)
3. Expand "Manual Edit Details" section
4. See: "Edited on 10/27/2025 by User"
5. See: "Reason: Lab analysis results"
6. Click "View comparison" to see calculated vs manual

**Result**: Full transparency on all changes

## Benefits 🎁

1. **No Database Migration**: Works with existing Airtable schema
2. **Complete Transparency**: Every edit is tracked and visible
3. **Reversible**: Can revert manual overrides back to calculated
4. **User-Friendly**: Intuitive pencil icons + inline editing
5. **Compliant**: Required reasons ensure accountability
6. **Flexible**: Edit at ingredient level OR final total level
7. **Accurate**: Auto-recalculation after ingredient changes

## Future Enhancements 💡

- Add auth to track actual user names instead of "User"
- Add ingredient-level USDA selection swap (change FDC ID)
- Add batch edit mode for multiple ingredients at once
- Add edit history timeline view
- Add "Suggest Edits" feature that recommends fixes
- Add CSV export of edit history for compliance reporting
