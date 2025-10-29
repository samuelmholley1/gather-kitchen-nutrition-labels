import Airtable from 'airtable'

// ============================================================================
// USER INGREDIENTS SERVICE
// ============================================================================

const base = new Airtable({
  apiKey: process.env.AIRTABLE_PAT_TOKEN
}).base(process.env.AIRTABLE_BASE_ID!)

const USER_INGREDIENTS_TABLE = process.env.AIRTABLE_USER_INGREDIENTS_TABLE || 'UserIngredients'
const OVERRIDES_HISTORY_TABLE = process.env.AIRTABLE_OVERRIDES_HISTORY_TABLE || 'OverridesHistory'

// ============================================================================
// TYPES
// ============================================================================

export interface UserIngredient {
  id: string
  name: string
  originalFdcId?: number
  originalUSDAName?: string
  customNutrients: Record<string, number>
  servingSizeGrams: number
  servingSizeDescription: string
  brand?: string
  category?: string
  tags: string[]
  source: string
  overrideReason?: string
  usageCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserIngredientData {
  name: string
  originalFdcId?: number
  originalUSDAName?: string
  customNutrients: Record<string, number>
  servingSizeGrams: number
  servingSizeDescription: string
  brand?: string
  category?: string
  tags?: string[]
  source?: string
  overrideReason?: string
  createdBy?: string
}

export interface UpdateUserIngredientData {
  name?: string
  customNutrients?: Record<string, number>
  servingSizeGrams?: number
  servingSizeDescription?: string
  brand?: string
  category?: string
  tags?: string[]
  overrideReason?: string
}

// ============================================================================
// HISTORY TRACKING TYPES
// ============================================================================

export interface OverridesHistoryRecord {
  id: string
  ingredientId: string
  action: 'Created' | 'Updated' | 'Deleted' | 'Restored'
  oldNutrientsJSON?: string
  newNutrientsJSON?: string
  changedFields: string[]
  changedBy: string
  reason?: string
  timestamp: string
}

export interface CreateHistoryRecordData {
  ingredientId: string
  action: 'Created' | 'Updated' | 'Deleted' | 'Restored'
  oldNutrientsJSON?: string
  newNutrientsJSON?: string
  changedFields: string[]
  changedBy?: string
  reason?: string
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Get all user ingredients with optional filtering
 */
export async function getUserIngredients(options: {
  search?: string | null
  category?: string | null
  limit?: number
  offset?: number
} = {}): Promise<UserIngredient[]> {
  const { search, category, limit = 50, offset = 0 } = options

  try {
    const records = await base(USER_INGREDIENTS_TABLE)
      .select({
        maxRecords: limit,
        ...(offset > 0 && { offset }),
        ...(search && {
          filterByFormula: `FIND("${search.toLowerCase()}", LOWER({Name}))`
        }),
        ...(category && {
          filterByFormula: category === 'all' ? '' : `{Category} = "${category}"`
        })
      })
      .all()

    return records.map(record => ({
      id: record.id,
      name: record.get('Name') as string,
      originalFdcId: record.get('OriginalFdcId') as number | undefined,
      originalUSDAName: record.get('OriginalUSDAName') as string | undefined,
      customNutrients: JSON.parse(record.get('CustomNutrientsJSON') as string || '{}'),
      servingSizeGrams: record.get('ServingSizeGrams') as number || 100,
      servingSizeDescription: record.get('ServingSizeDescription') as string || '100g',
      brand: record.get('Brand') as string | undefined,
      category: record.get('Category') as string | undefined,
      tags: JSON.parse(record.get('Tags') as string || '[]'),
      source: record.get('Source') as string || 'Manual Entry',
      overrideReason: record.get('OverrideReason') as string | undefined,
      usageCount: record.get('UsageCount') as number || 0,
      createdBy: record.get('CreatedBy') as string || 'system',
      createdAt: record.get('CreatedAt') as string,
      updatedAt: record.get('UpdatedAt') as string
    }))
  } catch (error) {
    console.error('[UserIngredients] Error fetching ingredients:', error)
    throw new Error('Failed to fetch user ingredients')
  }
}

/**
 * Get a single user ingredient by ID
 */
export async function getUserIngredient(id: string): Promise<UserIngredient | null> {
  try {
    const record = await base(USER_INGREDIENTS_TABLE).find(id)

    return {
      id: record.id,
      name: record.get('Name') as string,
      originalFdcId: record.get('OriginalFdcId') as number | undefined,
      originalUSDAName: record.get('OriginalUSDAName') as string | undefined,
      customNutrients: JSON.parse(record.get('CustomNutrientsJSON') as string || '{}'),
      servingSizeGrams: record.get('ServingSizeGrams') as number || 100,
      servingSizeDescription: record.get('ServingSizeDescription') as string || '100g',
      brand: record.get('Brand') as string | undefined,
      category: record.get('Category') as string | undefined,
      tags: JSON.parse(record.get('Tags') as string || '[]'),
      source: record.get('Source') as string || 'Manual Entry',
      overrideReason: record.get('OverrideReason') as string | undefined,
      usageCount: record.get('UsageCount') as number || 0,
      createdBy: record.get('CreatedBy') as string || 'system',
      createdAt: record.get('CreatedAt') as string,
      updatedAt: record.get('UpdatedAt') as string
    }
  } catch (error) {
    console.error('[UserIngredients] Error fetching ingredient:', error)
    return null
  }
}

/**
 * Create a new user ingredient
 */
export async function createUserIngredient(data: CreateUserIngredientData): Promise<UserIngredient> {
  try {
    const recordData = {
      'Name': data.name,
      ...(data.originalFdcId && { 'OriginalFdcId': data.originalFdcId }),
      ...(data.originalUSDAName && { 'OriginalUSDAName': data.originalUSDAName }),
      'CustomNutrientsJSON': JSON.stringify(data.customNutrients),
      'ServingSizeGrams': data.servingSizeGrams,
      'ServingSizeDescription': data.servingSizeDescription,
      ...(data.brand && { 'Brand': data.brand }),
      ...(data.category && { 'Category': data.category }),
      'Tags': JSON.stringify(data.tags || []),
      'Source': data.source || 'Manual Entry',
      ...(data.overrideReason && { 'OverrideReason': data.overrideReason }),
      'UsageCount': 0,
      'CreatedBy': data.createdBy || 'system'
    }

    const record = await base(USER_INGREDIENTS_TABLE).create(recordData)

    const newIngredient: UserIngredient = {
      id: record.id,
      name: record.get('Name') as string,
      originalFdcId: record.get('OriginalFdcId') as number | undefined,
      originalUSDAName: record.get('OriginalUSDAName') as string | undefined,
      customNutrients: JSON.parse(record.get('CustomNutrientsJSON') as string),
      servingSizeGrams: record.get('ServingSizeGrams') as number,
      servingSizeDescription: record.get('ServingSizeDescription') as string,
      brand: record.get('Brand') as string | undefined,
      category: record.get('Category') as string | undefined,
      tags: JSON.parse(record.get('Tags') as string || '[]'),
      source: record.get('Source') as string,
      overrideReason: record.get('OverrideReason') as string | undefined,
      usageCount: record.get('UsageCount') as number || 0,
      createdBy: record.get('CreatedBy') as string,
      createdAt: record.get('CreatedAt') as string,
      updatedAt: record.get('UpdatedAt') as string
    }

    // Create history record
    try {
      await createHistoryRecord({
        ingredientId: newIngredient.id,
        action: 'Created',
        newNutrientsJSON: JSON.stringify(newIngredient.customNutrients),
        changedFields: ['name', 'customNutrients', 'servingSizeGrams', 'servingSizeDescription', 'source'],
        changedBy: data.createdBy,
        reason: data.overrideReason || 'New custom ingredient created'
      })
    } catch (historyError) {
      console.warn('[UserIngredients] Failed to create history record for creation:', historyError)
      // Don't fail the creation if history fails
    }

    return newIngredient
  } catch (error) {
    console.error('[UserIngredients] Error creating ingredient:', error)
    throw new Error('Failed to create user ingredient')
  }
}

/**
 * Update an existing user ingredient
 */
export async function updateUserIngredient(id: string, data: UpdateUserIngredientData): Promise<UserIngredient | null> {
  try {
    // Get the current ingredient data for history tracking
    const oldIngredient = await getUserIngredient(id)
    if (!oldIngredient) return null

    const updateData: any = {}

    if (data.name) updateData['Name'] = data.name
    if (data.customNutrients) updateData['CustomNutrientsJSON'] = JSON.stringify(data.customNutrients)
    if (data.servingSizeGrams) updateData['ServingSizeGrams'] = data.servingSizeGrams
    if (data.servingSizeDescription) updateData['ServingSizeDescription'] = data.servingSizeDescription
    if (data.brand !== undefined) updateData['Brand'] = data.brand
    if (data.category) updateData['Category'] = data.category
    if (data.tags) updateData['Tags'] = JSON.stringify(data.tags)
    if (data.overrideReason !== undefined) updateData['OverrideReason'] = data.overrideReason

    const record = await base(USER_INGREDIENTS_TABLE).update(id, updateData)

    const updatedIngredient: UserIngredient = {
      id: record.id,
      name: record.get('Name') as string,
      originalFdcId: record.get('OriginalFdcId') as number | undefined,
      originalUSDAName: record.get('OriginalUSDAName') as string | undefined,
      customNutrients: JSON.parse(record.get('CustomNutrientsJSON') as string),
      servingSizeGrams: record.get('ServingSizeGrams') as number,
      servingSizeDescription: record.get('ServingSizeDescription') as string,
      brand: record.get('Brand') as string | undefined,
      category: record.get('Category') as string | undefined,
      tags: JSON.parse(record.get('Tags') as string || '[]'),
      source: record.get('Source') as string,
      overrideReason: record.get('OverrideReason') as string | undefined,
      usageCount: record.get('UsageCount') as number || 0,
      createdBy: record.get('CreatedBy') as string,
      createdAt: record.get('CreatedAt') as string,
      updatedAt: record.get('UpdatedAt') as string
    }

    // Create history record for the update
    try {
      const changedFields = getChangedFields(oldIngredient, updatedIngredient)
      if (changedFields.length > 0) {
        await createHistoryRecord({
          ingredientId: id,
          action: 'Updated',
          oldNutrientsJSON: JSON.stringify(oldIngredient.customNutrients),
          newNutrientsJSON: JSON.stringify(updatedIngredient.customNutrients),
          changedFields,
          changedBy: 'system', // TODO: Pass user ID when available
          reason: data.overrideReason || 'Ingredient updated'
        })
      }
    } catch (historyError) {
      console.warn('[UserIngredients] Failed to create history record for update:', historyError)
      // Don't fail the update if history fails
    }

    return updatedIngredient
  } catch (error) {
    console.error('[UserIngredients] Error updating ingredient:', error)
    return null
  }
}

/**
 * Delete a user ingredient (soft delete by marking as inactive)
 */
export async function deleteUserIngredient(id: string): Promise<boolean> {
  try {
    // Get the ingredient data before deletion for history
    const ingredient = await getUserIngredient(id)
    if (!ingredient) return false

    // Create history record before deletion
    try {
      await createHistoryRecord({
        ingredientId: id,
        action: 'Deleted',
        oldNutrientsJSON: JSON.stringify(ingredient.customNutrients),
        changedFields: ['name'], // Mark that the ingredient was removed
        changedBy: 'system', // TODO: Pass user ID when available
        reason: 'Ingredient deleted'
      })
    } catch (historyError) {
      console.warn('[UserIngredients] Failed to create history record for deletion:', historyError)
      // Don't fail the deletion if history fails
    }

    // For now, we'll do a hard delete
    // In the future, we might want to add an "Active" field for soft deletes
    await base(USER_INGREDIENTS_TABLE).destroy(id)
    return true
  } catch (error) {
    console.error('[UserIngredients] Error deleting ingredient:', error)
    return false
  }
}

/**
 * Search user ingredients for USDA search integration
 */
export async function searchUserIngredients(query: string, limit: number = 10): Promise<UserIngredient[]> {
  return getUserIngredients({
    search: query,
    limit
  })
}

/**
 * Increment usage count for an ingredient
 */
export async function incrementUsageCount(id: string): Promise<boolean> {
  try {
    const ingredient = await getUserIngredient(id)
    if (!ingredient) return false

    await base(USER_INGREDIENTS_TABLE).update(id, {
      'UsageCount': ingredient.usageCount + 1
    })

    return true
  } catch (error) {
    console.error('[UserIngredients] Error incrementing usage count:', error)
    return false
  }
}

// ============================================================================
// HISTORY TRACKING FUNCTIONS
// ============================================================================

/**
 * Create a history record for an ingredient change
 */
export async function createHistoryRecord(data: CreateHistoryRecordData): Promise<OverridesHistoryRecord> {
  try {
    const recordData = {
      'IngredientId': [data.ingredientId], // Airtable link field expects array
      'Action': data.action,
      ...(data.oldNutrientsJSON && { 'OldNutrientsJSON': data.oldNutrientsJSON }),
      ...(data.newNutrientsJSON && { 'NewNutrientsJSON': data.newNutrientsJSON }),
      'ChangedFields': data.changedFields,
      'ChangedBy': data.changedBy || 'system',
      ...(data.reason && { 'Reason': data.reason })
    }

    const record = await base(OVERRIDES_HISTORY_TABLE).create(recordData)

    return {
      id: record.id,
      ingredientId: (record.get('IngredientId') as any[])[0], // Get first linked record ID
      action: record.get('Action') as 'Created' | 'Updated' | 'Deleted' | 'Restored',
      oldNutrientsJSON: record.get('OldNutrientsJSON') as string | undefined,
      newNutrientsJSON: record.get('NewNutrientsJSON') as string | undefined,
      changedFields: record.get('ChangedFields') as string[] || [],
      changedBy: record.get('ChangedBy') as string,
      reason: record.get('Reason') as string | undefined,
      timestamp: record.get('Timestamp') as string
    }
  } catch (error) {
    console.error('[UserIngredients] Error creating history record:', error)
    throw new Error('Failed to create history record')
  }
}

/**
 * Get history records for a specific ingredient
 */
export async function getIngredientHistory(ingredientId: string, limit: number = 20): Promise<OverridesHistoryRecord[]> {
  try {
    const records = await base(OVERRIDES_HISTORY_TABLE)
      .select({
        maxRecords: limit,
        filterByFormula: `{IngredientId} = "${ingredientId}"`,
        sort: [{ field: 'Timestamp', direction: 'desc' }]
      })
      .all()

    return records.map(record => ({
      id: record.id,
      ingredientId: (record.get('IngredientId') as any[])[0],
      action: record.get('Action') as 'Created' | 'Updated' | 'Deleted' | 'Restored',
      oldNutrientsJSON: record.get('OldNutrientsJSON') as string | undefined,
      newNutrientsJSON: record.get('NewNutrientsJSON') as string | undefined,
      changedFields: record.get('ChangedFields') as string[] || [],
      changedBy: record.get('ChangedBy') as string,
      reason: record.get('Reason') as string | undefined,
      timestamp: record.get('Timestamp') as string
    }))
  } catch (error) {
    console.error('[UserIngredients] Error fetching ingredient history:', error)
    throw new Error('Failed to fetch ingredient history')
  }
}

/**
 * Helper function to determine which fields changed
 */
function getChangedFields(oldData: Partial<UserIngredient>, newData: Partial<UserIngredient>): string[] {
  const changedFields: string[] = []

  const fieldsToCheck = [
    'name', 'customNutrients', 'servingSizeGrams', 'servingSizeDescription',
    'brand', 'category', 'tags', 'overrideReason'
  ]

  for (const field of fieldsToCheck) {
    const oldValue = oldData[field as keyof UserIngredient]
    const newValue = newData[field as keyof UserIngredient]

    // Special handling for objects/arrays
    if (field === 'customNutrients' || field === 'tags') {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(field)
      }
    } else if (oldValue !== newValue) {
      changedFields.push(field)
    }
  }

  return changedFields
}