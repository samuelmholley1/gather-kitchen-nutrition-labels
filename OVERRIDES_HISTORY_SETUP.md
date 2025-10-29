# OverridesHistory Table Setup - Ingredient Override System

**Table Name:** OverridesHistory
**Purpose:** Track changes to UserIngredients for audit trail and debugging
**Last Updated:** October 29, 2025

---

## Table Structure

### Create New Table

1. In your Airtable base, click "+" next to table tabs
2. Choose "Start from scratch"
3. Name: **OverridesHistory**

### Create Fields

| # | Field Name | Field Type | Options/Description |
|---|------------|------------|---------------------|
| 1 | **IngredientId** | Link to UserIngredients | The ingredient that was changed |
| 2 | **Action** | Single select | Type of change made |
| 3 | **OldNutrientsJSON** | Long text | Nutrient values before change |
| 4 | **NewNutrientsJSON** | Long text | Nutrient values after change |
| 5 | **ChangedFields** | Multiple select | Which specific fields were modified |
| 6 | **ChangedBy** | Single line text | User who made the change |
| 7 | **Reason** | Long text | Why the change was made |
| 8 | **Timestamp** | Created time | Auto-generated timestamp |

### Field Configuration Details

**IngredientId:**
- Field type: Link to another record
- Link to: UserIngredients table
- Allow linking to multiple records: NO (one-to-many relationship)

**Action:**
- Field type: Single select
- Options:
  - Created (Green) - New ingredient created
  - Updated (Blue) - Existing ingredient modified
  - Deleted (Red) - Ingredient removed
  - Restored (Yellow) - Deleted ingredient restored

**OldNutrientsJSON:**
- Field type: Long text
- Enable rich text formatting: NO
- Required for Updates
- Example:
  ```json
  {
    "calories": 150,
    "protein": 25.0,
    "totalFat": 3.5
  }
  ```

**NewNutrientsJSON:**
- Field type: Long text
- Enable rich text formatting: NO
- Required for Created/Updated
- Same format as OldNutrientsJSON

**ChangedFields:**
- Field type: Multiple select
- Allow custom values: NO
- Options:
  - name
  - customNutrients
  - servingSizeGrams
  - servingSizeDescription
  - brand
  - category
  - tags
  - overrideReason

**ChangedBy:**
- Field type: Single line text
- For future multi-user support
- Default: "system" or user identifier

**Reason:**
- Field type: Long text
- Enable rich text formatting: NO
- Examples:
  - "Lab testing shows 10% lower calories"
  - "Brand-specific nutrition differs from generic"
  - "User reported incorrect values"
  - "Updated based on new USDA data"

**Timestamp:**
- Field type: Created time
- Auto-generated when record is created

---

## Integration Points

### Automatic History Creation

Whenever a UserIngredient is modified, automatically create a history record:

```typescript
// When updating an ingredient
const historyRecord = {
  IngredientId: ingredientId,
  Action: 'Updated',
  OldNutrientsJSON: JSON.stringify(oldNutrients),
  NewNutrientsJSON: JSON.stringify(newNutrients),
  ChangedFields: changedFields,
  ChangedBy: userId,
  Reason: reason || 'Manual update'
}
```

### History Viewer Component

Create a component to view change history:

```tsx
interface HistoryViewerProps {
  ingredientId: string
}

function HistoryViewer({ ingredientId }: HistoryViewerProps) {
  // Fetch and display history records
  // Show before/after comparisons
  // Allow reverting changes
}
```

### Audit Trail Features

- **Change Comparison**: Side-by-side view of old vs new values
- **Revert Functionality**: Allow undoing changes
- **Bulk History**: View all changes across ingredients
- **Export History**: CSV export for compliance reporting

---

## API Endpoints Needed

### GET /api/user-ingredients/[id]/history
- Get change history for a specific ingredient
- Include pagination
- Filter by date range or action type

### POST /api/user-ingredients/[id]/revert
- Revert an ingredient to a previous state
- Create new history record for the revert
- Require reason for revert

### GET /api/overrides-history
- Get all history records
- Admin endpoint for auditing
- Advanced filtering options

---

## Data Examples

### Example History Record (Update)

**IngredientId:** recABC123 (links to "Organic Chicken Breast")

**Action:** Updated

**OldNutrientsJSON:**
```json
{
  "calories": 165,
  "protein": 31.0,
  "totalFat": 3.6,
  "sodium": 74
}
```

**NewNutrientsJSON:**
```json
{
  "calories": 155,
  "protein": 32.0,
  "totalFat": 2.8,
  "sodium": 65
}
```

**ChangedFields:** ["calories", "totalFat", "sodium"]

**ChangedBy:** system

**Reason:** Lab testing shows 10% lower calories and fat than USDA generic data

### Example History Record (Created)

**IngredientId:** recDEF456 (links to "House-Made Balsamic Vinaigrette")

**Action:** Created

**OldNutrientsJSON:** null (empty for creations)

**NewNutrientsJSON:**
```json
{
  "calories": 120,
  "totalFat": 12.0,
  "sodium": 180,
  "totalCarbohydrate": 4.0
}
```

**ChangedFields:** ["name", "customNutrients", "category", "source"]

**ChangedBy:** system

**Reason:** Custom recipe with known ingredients

---

## Best Practices

### History Management

✅ **DO:**
- Create history records for ALL changes
- Include detailed reasons for changes
- Store complete before/after snapshots
- Track who made changes (for multi-user)
- Implement retention policies (keep last 100 changes per ingredient)

❌ **DON'T:**
- Delete history records (except for GDPR compliance)
- Store sensitive information in reasons
- Create history for read-only operations
- Allow history records to be modified

### Performance Considerations

- **Indexing**: Create views filtered by IngredientId for fast lookups
- **Pagination**: Always paginate history queries
- **Archiving**: Move old history to separate table after 1 year
- **Cleanup**: Remove history for deleted ingredients (if ingredient is permanently deleted)

### Security

- **Access Control**: Only admins can view full history
- **Audit Logging**: Log when history is accessed
- **Data Integrity**: Ensure history records cannot be altered
- **Backup**: Include history in regular backups

---

## Migration Strategy

### Phase 1: Basic History
1. Create OverridesHistory table
2. Add history creation to UserIngredients API
3. Create basic history viewer
4. Add revert functionality

### Phase 2: Advanced Features
1. Add bulk history operations
2. Implement history search/filtering
3. Add history export functionality
4. Create history analytics

---

## Testing Checklist

- [ ] History record created when ingredient is created
- [ ] History record created when ingredient is updated
- [ ] History record created when ingredient is deleted
- [ ] History viewer shows correct before/after values
- [ ] Revert functionality works correctly
- [ ] History is preserved when ingredient is restored
- [ ] Bulk history queries work efficiently
- [ ] History access is properly secured

---

**Status:** Ready for implementation
**Next Step:** Create table in Airtable base and update UserIngredients service</content>
<parameter name="filePath">/Users/samuelholley/Projects/gather_kitchen_nutrition_labels/OVERRIDES_HISTORY_SETUP.md