# Nutrition Label Audit Trail - No Schema Changes Required! 🎉

## Overview

This implementation provides enterprise-grade audit trails for nutrition label values **without requiring any Airtable schema changes**. All metadata is embedded in the existing `NutritionProfile` JSON field.

## How It Works

### Current State (Airtable)
```
FinalDishes table:
  - NutritionProfile: JSON field (already exists!)
```

### New Data Structure (Inside NutritionProfile JSON)

**Before (Legacy format - still supported):**
```json
{
  "kcal": 385,
  "carbs": 76.3,
  "protein": 12.4,
  "fat": 8.2
}
```

**After (New format with audit trail):**
```json
{
  "values": {
    "kcal": 400,
    "carbs": 76.3,
    "protein": 12.4,
    "fat": 8.2
  },
  "calculatedValues": {
    "kcal": 385,
    "carbs": 76.3,
    "protein": 12.4,
    "fat": 8.2
  },
  "source": "manual_override",
  "lastCalculated": "2025-10-27T15:30:00Z",
  "manualEditMetadata": {
    "timestamp": "2025-10-27T16:00:00Z",
    "editedBy": "user@example.com",
    "reason": "Lab testing showed higher calories",
    "editedFields": ["kcal"],
    "previousValues": {
      "kcal": 385
    }
  }
}
```

## Benefits

### ✅ No Schema Changes
- Uses existing `NutritionProfile` JSON field
- Fully backwards compatible
- Old records work without migration

### ✅ Atomic Operations
- All related data in one field
- No orphaned data across columns
- Single update operation

### ✅ Full Audit Trail
- Track what was edited and when
- Preserve original calculated values
- Require explanation for manual edits
- Easy to revert to calculated

### ✅ Transparency
- Show both calculated and displayed values
- Visual warnings for discrepancies
- One-click restore to calculated

## Implementation Phases

### Phase 1: Core Types & Utilities ✅
- [x] TypeScript types (`src/types/nutritionAudit.ts`)
- [x] Helper functions (`src/lib/nutritionAudit.ts`)
- [x] Backwards compatibility handling

### Phase 2: Calculation Updates
- [ ] Update calculate endpoint to save both calculated and displayed
- [ ] Normalize legacy data on read
- [ ] Preserve calculated values when ingredients change

### Phase 3: UI Enhancements
- [ ] Enhanced discrepancy warning with details
- [ ] "Use Calculated" / "Keep Manual Override" buttons
- [ ] Show edit metadata and reason
- [ ] Visual diff of values

### Phase 4: Manual Edit Flow
- [ ] Modal for manual value editing
- [ ] Mandatory reason field
- [ ] Confirmation and warnings
- [ ] API endpoint for applying overrides

### Phase 5: Revert Functionality
- [ ] API endpoint to revert to calculated
- [ ] UI button in discrepancy warning
- [ ] Preserve edit history (for future)

## Usage Examples

### Creating New Nutrition Data
```typescript
import { createNutritionLabelData } from '@/lib/nutritionAudit'

const calculatedNutrition = {
  kcal: 385,
  carbs: 76.3,
  protein: 12.4,
  fat: 8.2
}

const nutritionData = createNutritionLabelData(calculatedNutrition)
// Stores in NutritionProfile field
```

### Applying Manual Override
```typescript
import { applyManualOverride } from '@/lib/nutritionAudit'

const updatedData = applyManualOverride(
  currentNutritionData,
  { kcal: 400 }, // New value
  "Lab testing showed higher calories", // Reason (required)
  "user@example.com" // Who made the edit
)
```

### Reverting to Calculated
```typescript
import { revertToCalculated } from '@/lib/nutritionAudit'

const revertedData = revertToCalculated(currentNutritionData)
// Removes manual override, shows calculated values
```

### Reading Legacy Data
```typescript
import { normalizeNutritionProfile } from '@/types/nutritionAudit'

// Handles both old and new formats automatically
const normalized = normalizeNutritionProfile(record.fields.NutritionProfile)
console.log(normalized.values) // Displayed nutrition
console.log(normalized.calculatedValues) // Auto-calculated
console.log(normalized.source) // 'calculated' or 'manual_override'
```

## Migration Strategy

### Zero-Effort Migration
1. Deploy new code
2. Old records continue working (legacy format detected automatically)
3. New calculations save in new format
4. Manual edits create audit trail
5. No data loss, no manual intervention needed

### Gradual Enhancement
- Old records: Treated as "calculated" source
- First recalculation: Upgraded to new format
- Manual edit: Full audit trail created
- Natural migration over time as dishes are updated

## API Changes

### No Breaking Changes
All existing API endpoints continue working. New functionality is additive:

```typescript
// Old code still works
const nutrition = dish.NutritionProfile

// New code gets enhanced data
const nutritionData = normalizeNutritionProfile(dish.NutritionProfile)
const hasManualEdits = nutritionData.source === 'manual_override'
```

## Testing Checklist

- [ ] Legacy nutrition data reads correctly
- [ ] New calculations save with metadata
- [ ] Manual override creates audit trail
- [ ] Discrepancy detection works
- [ ] Revert to calculated works
- [ ] Edit reason is required
- [ ] Timestamps are correct
- [ ] Old and new formats coexist

## Next Steps

1. **Phase 2**: Update calculation endpoint to use new format
2. **Phase 3**: Enhance UI to show discrepancies
3. **Phase 4**: Add manual edit modal
4. **Phase 5**: Implement revert functionality

All without touching Airtable schema! 🚀
