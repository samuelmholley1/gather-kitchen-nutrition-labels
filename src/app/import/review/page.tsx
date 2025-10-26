'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '@/components/Header'
import MobileRestrict from '@/components/MobileRestrict'
import Toast from '@/components/Toast'
import Modal from '@/components/Modal'
import IngredientSearch from '@/components/IngredientSearch'
import IngredientSpecificationModal from '@/components/IngredientSpecificationModal'
import BatchIngredientSpecificationModal from '@/components/BatchIngredientSpecificationModal'
import { SmartParseResult } from '@/lib/smartRecipeParser'
import { USDAFood } from '@/types/recipe'
import { cleanIngredientForUSDASearch } from '@/lib/smartRecipeParser'

interface IngredientWithUSDA {
  quantity: number
  unit: string
  ingredient: string
  originalLine: string
  usdaFood: USDAFood | null
  searchQuery: string
  confirmed: boolean
  needsSpecification?: boolean
  specificationPrompt?: string
  specificationOptions?: string[]
  baseIngredient?: string
}

interface SubRecipeWithUSDA {
  name: string
  ingredients: IngredientWithUSDA[]
  quantityInFinalDish: number
  unitInFinalDish: string
}

export default function ReviewPage() {
  const router = useRouter()
  const [parseResult, setParseResult] = useState<SmartParseResult | null>(null)
  const [finalDishIngredients, setFinalDishIngredients] = useState<IngredientWithUSDA[]>([])
  const [subRecipes, setSubRecipes] = useState<SubRecipeWithUSDA[]>([])
  const [editingIngredient, setEditingIngredient] = useState<{
    type: 'final' | 'sub'
    subRecipeIndex?: number
    ingredientIndex: number
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [servingsPerContainer, setServingsPerContainer] = useState<number | 'other'>(1)
  const [otherServingsValue, setOtherServingsValue] = useState('')
  const [dishCategory, setDishCategory] = useState<string>('')
  const [dishName, setDishName] = useState<string>('')
  const [isEditingDishName, setIsEditingDishName] = useState(false)
  const [saveProgress, setSaveProgress] = useState('')
  const [autoSearching, setAutoSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 })
  const [hasAutoSearched, setHasAutoSearched] = useState(false)
  const [hasAutoSelectedServings, setHasAutoSelectedServings] = useState(false)
  const isNavigatingAway = useRef(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [modal, setModal] = useState<{
    isOpen: boolean
    type: 'info' | 'error' | 'warning' | 'success' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean
    suggestedName: string
    editableName: string
  }>({
    isOpen: false,
    suggestedName: '',
    editableName: ''
  })
  const [specificationModal, setSpecificationModal] = useState<{
    ingredient: IngredientWithUSDA & {
      needsSpecification?: boolean
      specificationPrompt?: string
      specificationOptions?: string[]
      baseIngredient?: string
    }
    type: 'final' | 'sub'
    subRecipeIndex?: number
    ingredientIndex: number
  } | null>(null)
  
  const [batchSpecificationModal, setBatchSpecificationModal] = useState<Array<{
    id: string
    quantity: number
    baseIngredient: string
    specificationPrompt: string
    specificationOptions: string[]
    type: 'final' | 'sub'
    subRecipeIndex?: number
    ingredientIndex: number
  }>>([])
  
  const [useBatchModal, setUseBatchModal] = useState(true) // Toggle for batch vs sequential

  // Auto-search USDA for all ingredients on mount
  useEffect(() => {
    const autoSearchUSDA = async () => {
      if (!parseResult || hasAutoSearched || finalDishIngredients.length === 0) return
      
      const totalIngredients = finalDishIngredients.length + subRecipes.reduce((sum, sub) => sum + sub.ingredients.length, 0)
      setSearchProgress({ current: 0, total: totalIngredients })
      setAutoSearching(true)
      setHasAutoSearched(true) // Prevent re-running
      
      let completed = 0
      
      try {
        // Search for final dish ingredients with variants
        const finalPromises = finalDishIngredients.map(async (ing, idx) => {
          // Skip if ingredient name is empty
          if (!ing.ingredient || ing.ingredient.trim().length === 0) {
            console.warn(`[USDA] Skipping empty ingredient`)
            completed++
            setSearchProgress({ current: completed, total: totalIngredients })
            return null
          }
          
          try {
            // Use variant search endpoint
            const response = await fetch(`/api/usda/search-with-variants`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ingredient: ing.ingredient })
            })
            
            completed++
            setSearchProgress({ current: completed, total: totalIngredients })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              const errorMsg = errorData.error || `HTTP ${response.status}`
              
              // User-friendly error messages
              if (response.status === 429 || errorMsg.includes('rate limit')) {
                console.error(`[USDA] Rate limit hit for "${ing.ingredient}". Please wait a moment.`)
              } else if (response.status >= 500 || errorMsg.includes('server error')) {
                console.error(`[USDA] USDA API temporarily unavailable for "${ing.ingredient}". Will retry.`)
              } else if (errorMsg.includes('Network') || errorMsg.includes('fetch')) {
                console.error(`[USDA] Network error searching for "${ing.ingredient}". Check your connection.`)
              } else {
                console.error(`[USDA] Search failed for "${ing.ingredient}": ${errorMsg}`)
              }
              return null
            }
            
            const data = await response.json()
            if (data.success && data.food) {
              if (data.attemptNumber > 1) {
                console.log(`[USDA] ✓ "${ing.ingredient}" matched using variant "${data.variantUsed}" (attempt ${data.attemptNumber})`)
              }
              return { idx, food: data.food, type: 'final' as const }
            } else {
              console.warn(`[USDA] No match found for "${ing.ingredient}" after trying ${data.variantsTried?.length || 0} variants`)
            }
          } catch (error) {
            console.error(`[USDA] Failed to search for "${ing.ingredient}":`, error)
          }
          return null
        })
        
        // Search for sub-recipe ingredients with variants
        const subPromises = subRecipes.flatMap((sub, subIdx) =>
          sub.ingredients.map(async (ing, ingIdx) => {
            // Skip if ingredient name is empty
            if (!ing.ingredient || ing.ingredient.trim().length === 0) {
              console.warn(`[USDA] Skipping empty ingredient`)
              completed++
              setSearchProgress({ current: completed, total: totalIngredients })
              return null
            }
            
            try {
              // Use variant search endpoint
              const response = await fetch(`/api/usda/search-with-variants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredient: ing.ingredient })
              })
              
              completed++
              setSearchProgress({ current: completed, total: totalIngredients })
              
              if (!response.ok) {
                console.error(`[USDA] Variant search failed for "${ing.ingredient}":`, response.status)
                return null
              }
              
              const data = await response.json()
              if (data.success && data.food) {
                if (data.attemptNumber > 1) {
                  console.log(`[USDA] ✓ "${ing.ingredient}" matched using variant "${data.variantUsed}" (attempt ${data.attemptNumber})`)
                }
                return { subIdx, ingIdx, food: data.food, type: 'sub' as const }
              } else {
                console.warn(`[USDA] No match found for "${ing.ingredient}" after trying ${data.variantsTried?.length || 0} variants`)
              }
            } catch (error) {
              console.error(`[USDA] Failed to search for "${ing.ingredient}":`, error)
            }
            return null
          })
        )
        
        const allResults = await Promise.all([...finalPromises, ...subPromises])
        
        // Update state with proposed matches
        const newFinalIngredients = [...finalDishIngredients]
        const newSubRecipes = JSON.parse(JSON.stringify(subRecipes))
        
        allResults.forEach(result => {
          if (!result) return
          
          if (result.type === 'final') {
            newFinalIngredients[result.idx] = {
              ...newFinalIngredients[result.idx],
              usdaFood: result.food,
              confirmed: true // Auto-confirm found matches
            }
          } else {
            newSubRecipes[result.subIdx].ingredients[result.ingIdx] = {
              ...newSubRecipes[result.subIdx].ingredients[result.ingIdx],
              usdaFood: result.food,
              confirmed: true // Auto-confirm found matches
            }
          }
        })
        
        setFinalDishIngredients(newFinalIngredients)
        setSubRecipes(newSubRecipes)
      } catch (error) {
        console.error('Auto-search failed:', error)
      } finally {
        setAutoSearching(false)
      }
    }
    
    autoSearchUSDA()
  }, [parseResult, finalDishIngredients.length, hasAutoSearched])

  // Auto-select serving size based on estimated total calories
  useEffect(() => {
    console.log('🔍 Serving auto-select useEffect triggered')
    console.log('  - allIngredientsConfirmed():', allIngredientsConfirmed())
    console.log('  - hasAutoSelectedServings:', hasAutoSelectedServings)
    console.log('  - finalDishIngredients count:', finalDishIngredients.length)
    console.log('  - confirmed ingredients:', finalDishIngredients.filter(i => i.confirmed).length)
    
    // Only auto-select once, and only after auto-search has completed
    // Don't require ALL ingredients to be confirmed - just calculate with what we have
    if (hasAutoSelectedServings || !hasAutoSearched) {
      console.log('⚠️ Skipping auto-select: already selected or auto-search not done yet')
      return
    }
    
    // Only proceed if we have at least SOME confirmed ingredients
    const confirmedCount = finalDishIngredients.filter(i => i.confirmed).length + 
                          subRecipes.reduce((sum, sub) => sum + sub.ingredients.filter(i => i.confirmed).length, 0)
    
    if (confirmedCount === 0) {
      console.log('⚠️ Skipping auto-select: no confirmed ingredients yet')
      return
    }
    
    console.log(`✓ Starting calorie calculation with ${confirmedCount} confirmed ingredients...`)
    
    // Calculate estimated total calories from confirmed ingredients
    let totalCalories = 0
    
    // Add final dish ingredients
    finalDishIngredients.forEach(ing => {
      if (ing.usdaFood && ing.confirmed) {
        const caloriesNutrient = ing.usdaFood.foodNutrients?.find(n => n.nutrientId === 1008)
        if (caloriesNutrient) {
          // caloriesNutrient.value is calories per 100g
          const caloriesPer100g = caloriesNutrient.value
          
          // For gram-based units (g, oz), quantity IS the total grams
          // For volume/count units (tsp, tbsp, cup), quantity needs to be multiplied by portion grams
          let totalGrams: number
          const unitLower = ing.unit.toLowerCase()
          if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') {
            // Quantity is already in grams
            totalGrams = ing.quantity
          } else if (unitLower === 'oz' || unitLower === 'ounce' || unitLower === 'ounces') {
            // Convert oz to grams (1 oz = 28.3495g)
            totalGrams = ing.quantity * 28.3495
          } else {
            // For other units (tsp, tbsp, cup, etc.), find matching USDA portion or use standard conversions
            let portionGrams = 100 // fallback
            
            // Try to find matching portion from USDA data
            const portions = ing.usdaFood.foodPortions || []
            const matchingPortion = portions.find(p => {
              const modifier = p.modifier?.toLowerCase() || ''
              const measureUnit = p.measureUnitName?.toLowerCase() || ''
              return modifier.includes(unitLower) || 
                     measureUnit.includes(unitLower) ||
                     (unitLower === 'tbsp' && (modifier.includes('tablespoon') || measureUnit.includes('tablespoon'))) ||
                     (unitLower === 'tsp' && (modifier.includes('teaspoon') || measureUnit.includes('teaspoon')))
            })
            
            if (matchingPortion) {
              portionGrams = matchingPortion.gramWeight
            } else {
              // Use standard cooking conversions if no USDA match
              if (unitLower === 'tsp' || unitLower === 'teaspoon') {
                portionGrams = 5 // 1 tsp ≈ 5g for most liquids/powders
              } else if (unitLower === 'tbsp' || unitLower === 'tablespoon') {
                portionGrams = 15 // 1 Tbsp ≈ 15g
              } else if (unitLower === 'cup') {
                portionGrams = 240 // 1 cup ≈ 240g for liquids
              } else {
                // Last resort: use first non-100g portion or 100g
                const nonDefaultPortion = portions.find(p => p.gramWeight !== 100)
                portionGrams = nonDefaultPortion?.gramWeight || 100
              }
            }
            
            totalGrams = ing.quantity * portionGrams
          }
          
          // Scale calories: (calories per 100g) × (total grams / 100)
          const ingredientCalories = caloriesPer100g * (totalGrams / 100)
          console.log(`  ${ing.ingredient}: ${ingredientCalories.toFixed(1)} cal [${ing.quantity} ${ing.unit} = ${totalGrams.toFixed(1)}g total]`)
          totalCalories += ingredientCalories
        }
      }
    })
    
    // Add sub-recipe ingredients
    subRecipes.forEach(sub => {
      sub.ingredients.forEach(ing => {
        if (ing.usdaFood && ing.confirmed) {
          const caloriesNutrient = ing.usdaFood.foodNutrients?.find(n => n.nutrientId === 1008)
          if (caloriesNutrient) {
            const caloriesPer100g = caloriesNutrient.value
            
            // Handle different units properly
            let totalGrams: number
            const unitLower = ing.unit.toLowerCase()
            if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') {
              totalGrams = ing.quantity
            } else if (unitLower === 'oz' || unitLower === 'ounce' || unitLower === 'ounces') {
              totalGrams = ing.quantity * 28.3495
            } else {
              // For other units (tsp, tbsp, cup, etc.), find matching USDA portion or use standard conversions
              let portionGrams = 100 // fallback
              
              // Try to find matching portion from USDA data
              const portions = ing.usdaFood.foodPortions || []
              const matchingPortion = portions.find(p => {
                const modifier = p.modifier?.toLowerCase() || ''
                const measureUnit = p.measureUnitName?.toLowerCase() || ''
                return modifier.includes(unitLower) || 
                       measureUnit.includes(unitLower) ||
                       (unitLower === 'tbsp' && (modifier.includes('tablespoon') || measureUnit.includes('tablespoon'))) ||
                       (unitLower === 'tsp' && (modifier.includes('teaspoon') || measureUnit.includes('teaspoon')))
              })
              
              if (matchingPortion) {
                portionGrams = matchingPortion.gramWeight
              } else {
                // Use standard cooking conversions if no USDA match
                if (unitLower === 'tsp' || unitLower === 'teaspoon') {
                  portionGrams = 5 // 1 tsp ≈ 5g for most liquids/powders
                } else if (unitLower === 'tbsp' || unitLower === 'tablespoon') {
                  portionGrams = 15 // 1 Tbsp ≈ 15g
                } else if (unitLower === 'cup') {
                  portionGrams = 240 // 1 cup ≈ 240g for liquids
                } else {
                  // Last resort: use first non-100g portion or 100g
                  const nonDefaultPortion = portions.find(p => p.gramWeight !== 100)
                  portionGrams = nonDefaultPortion?.gramWeight || 100
                }
              }
              
              totalGrams = ing.quantity * portionGrams
            }
            
            const ingredientCalories = caloriesPer100g * (totalGrams / 100)
            console.log(`  ${sub.name} - ${ing.ingredient}: ${ingredientCalories.toFixed(1)} cal [${ing.quantity} ${ing.unit} = ${totalGrams.toFixed(1)}g]`)
            totalCalories += ingredientCalories
          }
        }
      })
    })
    
    console.log(`🔥 TOTAL RECIPE CALORIES: ${totalCalories.toFixed(1)}`)
    
    // Auto-select serving size:
    // 1. If recipe explicitly states servings (e.g., "Makes: 12 Servings"), use that
    // 2. Otherwise, use calorie-based logic: <800 cal = 1 serving, ≥800 = 2 servings
    // 3. If anything goes wrong or totalCalories is 0, default to 1
    
    if (parseResult?.explicitServings) {
      console.log(`✓ Using explicit serving count from recipe: ${parseResult.explicitServings} servings`)
      const explicitCount = parseResult.explicitServings
      
      // Check if it's one of the preset values
      const presetValues = [1, 1.5, 2, 2.5]
      if (presetValues.includes(explicitCount)) {
        setServingsPerContainer(explicitCount)
      } else {
        // Use "Other" field for non-preset values
        setServingsPerContainer('other')
        setOtherServingsValue(explicitCount.toString())
      }
    } else if (totalCalories > 0 && totalCalories < 800) {
      console.log(`✓ Auto-selected 1 serving (${totalCalories.toFixed(1)} cal < 800)`)
      setServingsPerContainer(1)
    } else if (totalCalories >= 800) {
      console.log(`✓ Auto-selected 2 servings (${totalCalories.toFixed(1)} cal >= 800)`)
      setServingsPerContainer(2)
    } else {
      console.log(`⚠️ Fallback to 1 serving (totalCalories = ${totalCalories})`)
      // Fallback: if we can't calculate or something goes wrong, default to 1
      setServingsPerContainer(1)
    }
    setHasAutoSelectedServings(true) // Mark that we've auto-selected
  }, [finalDishIngredients, subRecipes, hasAutoSelectedServings, hasAutoSearched, parseResult])

  // Auto-select dish category based on recipe name and ingredients
  useEffect(() => {
    if (!parseResult || dishCategory) return // Only run once, don't override user selection
    
    const dishName = parseResult.finalDish.name.toLowerCase()
    const allIngredients = [
      ...finalDishIngredients.map(i => i.ingredient.toLowerCase()),
      ...subRecipes.flatMap(s => s.ingredients.map(i => i.ingredient.toLowerCase()))
    ].join(' ')
    
    // Category detection based on Gather Kitchen's 3 collections
    if (dishName.includes('burrito') || dishName.includes('breakfast') || dishName.includes('egg')) {
      setDishCategory('Breakfast Offerings')
    } else if (dishName.includes('pasta') || dishName.includes('zoodle') || dishName.includes('primavera') || 
               dishName.includes('vegetarian') || dishName.includes('marinara') ||
               allIngredients.includes('pasta') || allIngredients.includes('zoodles')) {
      setDishCategory('The Garden Collection')
    } else {
      // Everything else goes to Staples (meat, seafood, main dishes)
      setDishCategory('The Staples Collection')
    }
  }, [parseResult, dishCategory, finalDishIngredients, subRecipes])

  useEffect(() => {
    // Don't redirect if we're in the process of navigating away after save
    if (isNavigatingAway.current) return
    
    // Load parsed recipe from sessionStorage FIRST
    const stored = sessionStorage.getItem('parsedRecipe')
    if (!stored) {
      router.push('/')
      return
    }

    const result: SmartParseResult = JSON.parse(stored)
    setParseResult(result)
    setDishName(result.finalDish.name) // Initialize dish name

    // Initialize final dish ingredients with USDA search queries
    const finalIngredients = result.finalDish.ingredients
      .filter(ing => !ing.isSubRecipe)
      .map(ing => ({
        ...ing,
        usdaFood: null,
        searchQuery: cleanIngredientForUSDASearch(ing.ingredient),
        confirmed: false
      }))
    setFinalDishIngredients(finalIngredients)

    // Initialize sub-recipes with USDA search queries
    const subsWithUSDA = result.subRecipes.map(sub => ({
      ...sub,
      ingredients: sub.ingredients.map(ing => ({
        ...ing,
        usdaFood: null,
        searchQuery: cleanIngredientForUSDASearch(ing.ingredient),
        confirmed: false
      }))
    }))
    setSubRecipes(subsWithUSDA)

    // ONLY check for interrupted save AFTER we've loaded the current recipe
    // Check if there's a save marker for a DIFFERENT recipe
    const checkInterruptedSave = async () => {
      try {
        const saveInProgress = localStorage.getItem('recipe_save_in_progress')
        if (!saveInProgress) return // No marker, nothing to check
        
        const { recipeName, timestamp, subRecipeCount, status } = JSON.parse(saveInProgress)
        
        // If marked as completed, just clear it and move on
        if (status === 'completed') {
          localStorage.removeItem('recipe_save_in_progress')
          return
        }
        
        // If this is for the CURRENT recipe we're working on, skip the check
        // (User might have refreshed the page while on review)
        if (result.finalDish.name.toLowerCase().trim() === recipeName.toLowerCase().trim()) {
          // This is the current recipe - don't show popup, user is still working on it
          return
        }
        
        const minutesAgo = Math.floor((Date.now() - timestamp) / 60000)

        if (minutesAgo < 5) {
          // Recent save attempt - verify whether the final dish already exists to avoid false alarms
          try {
            const listResp = await fetch('/api/final-dishes')
            if (listResp.ok) {
              const { finalDishes } = await listResp.json()
              const exists = finalDishes.some((d: any) => d.name && d.name.toLowerCase().trim() === recipeName.toLowerCase().trim())
              if (exists) {
                // Final dish already exists - clear marker and skip prompt
                localStorage.removeItem('recipe_save_in_progress')
                return
              }
            }
          } catch (checkErr) {
            console.warn('Could not verify existing final dish before showing incomplete-save prompt:', checkErr)
          }
          
          // If we get here, show the prompt
          setModal({
            isOpen: true,
            type: 'warning',
            title: 'Incomplete Save Detected',
            message: `Recipe "${recipeName}" was being saved ${minutesAgo} minute(s) ago but didn't complete.\n\nThis might be due to a browser crash or network error. ${subRecipeCount > 0 ? `${subRecipeCount} sub-recipe(s) may have been created. ` : ''}\n\nWould you like to check the Sub-Recipes page for cleanup?`,
            onConfirm: () => {
              localStorage.removeItem('recipe_save_in_progress')
              router.push('/sub-recipes')
            }
          })
          return
        }

        // Old save attempt (>5 min) - clear it
        localStorage.removeItem('recipe_save_in_progress')
      } catch (e) {
        console.warn('Could not check for interrupted save:', e)
      }
    }

    // Run the check after a short delay to ensure state is set
    setTimeout(() => checkInterruptedSave(), 100)

    // Check for ingredients needing specification
    const allNeedingSpec: Array<{
      id: string
      quantity: number
      baseIngredient: string
      specificationPrompt: string
      specificationOptions: string[]
      type: 'final' | 'sub'
      subRecipeIndex?: number
      ingredientIndex: number
    }> = []
    
    // Collect from final dish
    finalIngredients.forEach((ing: any, idx: number) => {
      if (ing.needsSpecification && ing.baseIngredient) {
        allNeedingSpec.push({
          id: `final-${idx}`,
          quantity: ing.quantity,
          baseIngredient: ing.baseIngredient,
          specificationPrompt: ing.specificationPrompt || 'Select variety:',
          specificationOptions: ing.specificationOptions || [],
          type: 'final',
          ingredientIndex: idx
        })
      }
    })
    
    // Collect from sub-recipes
    subsWithUSDA.forEach((sub, subIdx) => {
      sub.ingredients.forEach((ing: any, ingIdx: number) => {
        if (ing.needsSpecification && ing.baseIngredient) {
          allNeedingSpec.push({
            id: `sub-${subIdx}-${ingIdx}`,
            quantity: ing.quantity,
            baseIngredient: ing.baseIngredient,
            specificationPrompt: ing.specificationPrompt || 'Select variety:',
            specificationOptions: ing.specificationOptions || [],
            type: 'sub',
            subRecipeIndex: subIdx,
            ingredientIndex: ingIdx
          })
        }
      })
    })
    
    if (allNeedingSpec.length > 0) {
      if (useBatchModal && allNeedingSpec.length > 1) {
        // Use batch modal if 2+ ingredients need specification
        setBatchSpecificationModal(allNeedingSpec)
      } else {
        // Use sequential modal for single ingredient
        const first = allNeedingSpec[0]
        const ingredient = first.type === 'final'
          ? finalIngredients[first.ingredientIndex]
          : subsWithUSDA[first.subRecipeIndex!].ingredients[first.ingredientIndex]
        
        setSpecificationModal({
          ingredient: ingredient as any,
          type: first.type,
          subRecipeIndex: first.subRecipeIndex,
          ingredientIndex: first.ingredientIndex
        })
      }
      return // Don't proceed with auto-search until specification is complete
    }

    // Warn before leaving page if there are unconfirmed ingredients
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const allConfirmed = [...finalIngredients, ...subsWithUSDA.flatMap(s => s.ingredients)]
        .every(ing => ing.confirmed)
      
      if (!saving && !allConfirmed) {
        e.preventDefault()
        e.returnValue = 'You have unconfirmed ingredients. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [router, saving])

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter = Quick save (if all confirmed)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (allIngredientsConfirmed() && !saving) {
          e.preventDefault()
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [finalDishIngredients, subRecipes, saving]) // Added missing dependencies

  const handleSelectUSDA = (food: USDAFood) => {
    if (!editingIngredient) return

    if (editingIngredient.type === 'final') {
      const updated = [...finalDishIngredients]
      updated[editingIngredient.ingredientIndex] = {
        ...updated[editingIngredient.ingredientIndex],
        usdaFood: food,
        confirmed: true
      }
      setFinalDishIngredients(updated)
    } else {
      const updated = [...subRecipes]
      updated[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex] = {
        ...updated[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex],
        usdaFood: food,
        confirmed: true
      }
      setSubRecipes(updated)
    }

    setEditingIngredient(null)
  }

  const allIngredientsConfirmed = () => {
    const finalConfirmed = finalDishIngredients.every(ing => ing.confirmed)
    const subsConfirmed = subRecipes.every(sub => 
      sub.ingredients.every(ing => ing.confirmed)
    )
    return finalConfirmed && subsConfirmed
  }

  const handleSave = async () => {
    if (!parseResult) return
    if (!allIngredientsConfirmed()) {
      setToast({ message: 'Please confirm all ingredient USDA matches before saving', type: 'error' })
      return
    }

    // Check for duplicate dish name before proceeding
    try {
      const response = await fetch('/api/final-dishes')
      if (response.ok) {
        const { finalDishes } = await response.json()
        const isDuplicate = finalDishes.some((dish: any) => 
          dish.name.toLowerCase().trim() === dishName.toLowerCase().trim()
        )
        
        if (isDuplicate) {
          // Find suggested name with (2), (3), etc.
          const existingNames = finalDishes.map((dish: any) => dish.name.toLowerCase().trim())
          let counter = 2
          let suggestedName = `${dishName} (${counter})`
          
          while (existingNames.includes(suggestedName.toLowerCase().trim())) {
            counter++
            suggestedName = `${dishName} (${counter})`
            if (counter > 100) break // safety check
          }
          
          // Show rename modal
          setRenameModal({
            isOpen: true,
            suggestedName,
            editableName: suggestedName
          })
          return // Don't proceed with save yet
        }
      }
    } catch (error) {
      console.warn('Could not check for duplicate dishes:', error)
      // Continue with save anyway if check fails
    }

    // Proceed with actual save
    performSave()
  }

  const performSave = async () => {
    if (!parseResult) return

    // Save progress to localStorage in case of browser crash during save
    try {
      localStorage.setItem('recipe_save_in_progress', JSON.stringify({
        recipeName: dishName,
        timestamp: Date.now(),
        subRecipeCount: subRecipes.length,
        status: 'in_progress'
      }))
    } catch (e) {
      console.warn('Could not save progress to localStorage:', e)
    }

    setSaving(true)
    setSaveProgress('Preparing to save...')
    
    const createdSubRecipeIds: string[] = []
    
    try {
      const { createSubRecipe, createFinalDish } = await import('@/lib/smartRecipeSaver')
      
      // Step 1: Create all sub-recipes in parallel for speed (5-10x faster than sequential)
      const subRecipesData: Array<{ id: string, name: string, nutritionProfile: any, totalWeight: number, quantityInFinalDish: number, unitInFinalDish: string }> = []
      
      if (subRecipes.length > 0) {
        setSaveProgress(`Creating ${subRecipes.length} sub-recipe${subRecipes.length > 1 ? 's' : ''} in parallel...`)
        
        try {
          const subRecipeResults = await Promise.all(
            subRecipes.map(async (subRecipe, i) => {
              try {
                const result = await createSubRecipe(subRecipe)
                return {
                  success: true,
                  id: result.id,
                  name: subRecipe.name,
                  nutritionProfile: result.nutritionProfile,
                  totalWeight: result.totalWeight,
                  quantityInFinalDish: subRecipe.quantityInFinalDish,
                  unitInFinalDish: subRecipe.unitInFinalDish,
                  index: i
                }
              } catch (error) {
                return {
                  success: false,
                  error,
                  name: subRecipe.name,
                  index: i
                }
              }
            })
          )
          
          // Check for failures
          const failed = subRecipeResults.filter(r => !r.success)
          if (failed.length > 0) {
            // Rollback: Delete successfully created sub-recipes
            const successful = subRecipeResults.filter(r => r.success)
            setSaveProgress('Sub-recipe creation failed - rolling back...')
            
            await Promise.all(
              successful.map(async (result: any) => {
                try {
                  await fetch(`/api/sub-recipes/${result.id}`, { method: 'DELETE' })
                } catch (deleteError) {
                  console.error(`Failed to delete sub-recipe ${result.id}:`, deleteError)
                }
              })
            )
            
            throw new Error(`Failed to create sub-recipe "${failed[0].name}": ${failed[0].error instanceof Error ? failed[0].error.message : 'Unknown error'}`)
          }
          
          // All succeeded - collect data and IDs
          subRecipeResults.forEach((result: any) => {
            createdSubRecipeIds.push(result.id)
            subRecipesData.push({
              id: result.id,
              name: result.name,
              nutritionProfile: result.nutritionProfile,
              totalWeight: result.totalWeight,
              quantityInFinalDish: result.quantityInFinalDish,
              unitInFinalDish: result.unitInFinalDish
            })
          })
        } catch (error) {
          throw error // Re-throw to outer catch for user-facing error
        }
      }

      // Step 2: Create final dish with sub-recipes
      setSaveProgress(`Creating final dish "${dishName}"...`)
      let finalDishId: string
      try {
        // Determine final servings-per-container override to send to saver
        let finalServingsOverride: number | undefined = undefined
        if (servingsPerContainer === 'other') {
          const parsed = parseFloat(otherServingsValue || '')
          if (!isNaN(parsed) && isFinite(parsed)) {
            finalServingsOverride = Math.max(1, parseFloat(parsed.toFixed(1)))
          }
        } else if (typeof servingsPerContainer === 'number') {
          finalServingsOverride = Math.max(1, parseFloat(servingsPerContainer.toFixed ? servingsPerContainer.toFixed(1) : `${servingsPerContainer}`))
        }

        finalDishId = await createFinalDish(
          dishName,
          finalDishIngredients,
          subRecipesData,
          finalServingsOverride
        )
      } catch (finalDishError) {
        // Rollback: Delete all created sub-recipes if final dish creation fails
        setSaveProgress('Final dish creation failed - rolling back sub-recipes...')
        
        let rollbackFailures = 0
        const failedIds: string[] = []
        for (const subRecipeId of createdSubRecipeIds) {
          try {
            const deleteResponse = await fetch(`/api/sub-recipes/${subRecipeId}`, { method: 'DELETE' })
            if (!deleteResponse.ok) {
              console.error(`Failed to delete sub-recipe ${subRecipeId}: HTTP ${deleteResponse.status}`)
              rollbackFailures++
              failedIds.push(subRecipeId)
            }
          } catch (deleteError) {
            console.error(`Failed to delete sub-recipe ${subRecipeId}:`, deleteError)
            rollbackFailures++
            failedIds.push(subRecipeId)
          }
        }
        
        // Warn user if rollback had issues - make it very visible!
        if (rollbackFailures > 0) {
          const warningMessage = 
            `⚠️ ROLLBACK INCOMPLETE: Failed to delete ${rollbackFailures} of ${createdSubRecipeIds.length} sub-recipes. ` +
            `These orphaned records may remain in your database. ` +
            `IDs: ${failedIds.join(', ')}. ` +
            `You may need to manually delete them from Airtable.`
          
          console.error(warningMessage)
          
          // Show modal to user (they need to know about this!)
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Cleanup Incomplete',
            message: `We tried to clean up ${createdSubRecipeIds.length} sub-recipes after the save failed, but ${rollbackFailures} deletions failed. These orphaned records may remain in your database.\n\nYou may need to manually delete them from Airtable later.\n\nFailed IDs: ${failedIds.join(', ')}`
          })
        }
        
        throw finalDishError
      }

      // Success!
      setSaveProgress('✅ Recipe saved successfully!')
      
      // Mark save as completed (not just remove - set status to completed)
      try {
        localStorage.setItem('recipe_save_in_progress', JSON.stringify({
          recipeName: dishName,
          timestamp: Date.now(),
          subRecipeCount: subRecipes.length,
          status: 'completed'
        }))
      } catch (e) {
        console.warn('Could not mark save as completed:', e)
      }
      
      // Set flag to prevent useEffect from redirecting to / when we clear sessionStorage
      isNavigatingAway.current = true
      
      // Clear session storage FIRST (so useEffect doesn't run again)
      sessionStorage.removeItem('parsedRecipe')
      sessionStorage.removeItem('originalRecipeText')
      
      // Then redirect to final dishes page
      router.push(`/final-dishes`)
      
    } catch (error) {
      console.error('Save failed:', error)
      setSaveProgress('')
      
      // If some sub-recipes were created, inform user
      let errorMessage = `Failed to save recipe: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
      
      if (createdSubRecipeIds.length > 0) {
        errorMessage += `Warning: ${createdSubRecipeIds.length} sub-recipe(s) were created before the error occurred. You may need to delete them manually from the Sub-Recipes page to avoid duplicates.\n\n`
      }
      
      errorMessage += 'Please try again or contact support if the issue persists.'
      
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: errorMessage
      })
    } finally {
      setSaving(false)
      setSaveProgress('')
      // Clear save progress marker even on error
      try {
        localStorage.removeItem('recipe_save_in_progress')
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  // Handle ingredient specification
  const handleSpecify = (variety: string) => {
    if (!specificationModal) return

    const { type, ingredientIndex, subRecipeIndex } = specificationModal
    const updatedIngredient = variety || `medium ${specificationModal.ingredient.baseIngredient || specificationModal.ingredient.unit}`

    if (type === 'final') {
      const updated = [...finalDishIngredients]
      updated[ingredientIndex] = {
        ...updated[ingredientIndex],
        ingredient: updatedIngredient,
        searchQuery: cleanIngredientForUSDASearch(updatedIngredient),
        needsSpecification: false
      }
      setFinalDishIngredients(updated)
    } else {
      const updated = [...subRecipes]
      updated[subRecipeIndex!].ingredients[ingredientIndex] = {
        ...updated[subRecipeIndex!].ingredients[ingredientIndex],
        ingredient: updatedIngredient,
        searchQuery: cleanIngredientForUSDASearch(updatedIngredient),
        needsSpecification: false
      }
      setSubRecipes(updated)
    }

    // Check for more ingredients needing specification
    const allIngredients = [
      ...finalDishIngredients.map((ing, idx) => ({ ...ing, type: 'final' as const, ingredientIndex: idx })),
      ...subRecipes.flatMap((sub, subIdx) => 
        sub.ingredients.map((ing, ingIdx) => ({ ...ing, type: 'sub' as const, subRecipeIndex: subIdx, ingredientIndex: ingIdx }))
      )
    ]
    const nextNeedsSpec = allIngredients.find((ing: any) => ing.needsSpecification && 
      !(ing.type === type && ing.ingredientIndex === ingredientIndex && ing.subRecipeIndex === subRecipeIndex))
    
    if (nextNeedsSpec) {
      setSpecificationModal(nextNeedsSpec as any)
    } else {
      setSpecificationModal(null)
      // All specifications complete, allow auto-search to proceed
    }
  }

  const handleSkipSpecification = () => {
    handleSpecify('') // Empty string will use default "medium"
  }

  const handleCancelSpecification = () => {
    setSpecificationModal(null)
    router.push('/import') // Go back to import page
  }

  // Handle batch specification
  const handleBatchSpecify = (specifications: Map<string, string>) => {
    // Apply all specifications
    specifications.forEach((variety, id) => {
      const parts = id.split('-')
      if (parts[0] === 'final') {
        const idx = parseInt(parts[1])
        const updated = [...finalDishIngredients]
        updated[idx] = {
          ...updated[idx],
          ingredient: variety,
          searchQuery: cleanIngredientForUSDASearch(variety),
          needsSpecification: false
        }
        setFinalDishIngredients(updated)
      } else if (parts[0] === 'sub') {
        const subIdx = parseInt(parts[1])
        const ingIdx = parseInt(parts[2])
        const updated = [...subRecipes]
        updated[subIdx].ingredients[ingIdx] = {
          ...updated[subIdx].ingredients[ingIdx],
          ingredient: variety,
          searchQuery: cleanIngredientForUSDASearch(variety),
          needsSpecification: false
        }
        setSubRecipes(updated)
      }
    })
    
    setBatchSpecificationModal([])
    setHasAutoSearched(false) // Trigger auto-search with new specifications
  }

  const handleBatchSkipAll = () => {
    // Use "medium" as default for all
    batchSpecificationModal.forEach(spec => {
      const defaultVariety = `medium ${spec.baseIngredient}`
      if (spec.type === 'final') {
        const updated = [...finalDishIngredients]
        updated[spec.ingredientIndex] = {
          ...updated[spec.ingredientIndex],
          ingredient: defaultVariety,
          searchQuery: cleanIngredientForUSDASearch(defaultVariety),
          needsSpecification: false
        }
        setFinalDishIngredients(updated)
      } else {
        const updated = [...subRecipes]
        updated[spec.subRecipeIndex!].ingredients[spec.ingredientIndex] = {
          ...updated[spec.subRecipeIndex!].ingredients[spec.ingredientIndex],
          ingredient: defaultVariety,
          searchQuery: cleanIngredientForUSDASearch(defaultVariety),
          needsSpecification: false
        }
        setSubRecipes(updated)
      }
    })
    
    setBatchSpecificationModal([])
    setHasAutoSearched(false) // Trigger auto-search with defaults
  }

  const handleBatchCancel = () => {
    setBatchSpecificationModal([])
    router.push('/import') // Go back to import page
  }

  if (!parseResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <MobileRestrict>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Review & Confirm
          </h1>
          <p className="text-gray-600 text-lg">
            Review the parsed recipe and confirm USDA matches for each ingredient
          </p>
          
          {/* Progress Counter & Bar */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className={`px-4 py-2 rounded-lg font-medium ${
                allIngredientsConfirmed() 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {allIngredientsConfirmed() ? (
                  <span>✓ All ingredients confirmed!</span>
                ) : (
                  <span>
                    {[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => i.confirmed).length} of {[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].length} ingredients confirmed
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {subRecipes.length > 0 && `${subRecipes.length} sub-recipe${subRecipes.length > 1 ? 's' : ''} detected`}
              </div>
              
              {/* Bulk Skip Button */}
              {!allIngredientsConfirmed() && [...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].some(i => !i.confirmed) && (
                <button
                  onClick={() => {
                    const unconfirmedCount = [...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => !i.confirmed).length
                    setModal({
                      isOpen: true,
                      type: 'warning',
                      title: 'Skip All Remaining Ingredients?',
                      message: `This will skip all ${unconfirmedCount} remaining unconfirmed ingredients.\n\nThese ingredients will NOT contribute to nutrition calculations. Only do this if they're negligible or non-food items.`,
                      onConfirm: () => {
                        // Skip all unconfirmed in final dish
                        setFinalDishIngredients(finalDishIngredients.map(ing => 
                          ing.confirmed ? ing : { ...ing, confirmed: true, usdaFood: null }
                        ))
                        // Skip all unconfirmed in sub-recipes
                        setSubRecipes(subRecipes.map(sub => ({
                          ...sub,
                          ingredients: sub.ingredients.map(ing =>
                            ing.confirmed ? ing : { ...ing, confirmed: true, usdaFood: null }
                          )
                        })))
                      }
                    })
                  }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Skip All Remaining
                </button>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  allIngredientsConfirmed() ? 'bg-green-600' : 'bg-amber-500'
                }`}
                style={{ 
                  width: `${([...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => i.confirmed).length / [...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].length) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Save Preview Summary */}
        {allIngredientsConfirmed() && (
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              Ready to Save!
            </h3>
            <div className="text-emerald-800 space-y-2">
              <p className="font-medium">This will create:</p>
              <ul className="ml-6 space-y-1">
                {subRecipes.length > 0 && (
                  <li>✓ {subRecipes.length} Sub-Recipe{subRecipes.length > 1 ? 's' : ''}: {subRecipes.map(s => s.name).join(', ')}</li>
                )}
                <li>✓ 1 Final Dish: {dishName}</li>
                <li className="text-sm text-emerald-700 mt-2">
                  📊 Total: {[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => i.usdaFood).length} ingredients with nutrition data
                  {[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => !i.usdaFood).length > 0 && 
                    `, ${[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => !i.usdaFood).length} skipped`
                  }
                </li>
              </ul>
            </div>
            {/* Servings per container selector */}
            <div className="mt-4 bg-white border border-emerald-100 p-4 rounded-md">
              <label className="block text-sm font-medium text-emerald-900 mb-2">Servings per container</label>
              <div className="flex items-center gap-3 flex-wrap">
                {([1, 1.5, 2, 2.5] as number[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setServingsPerContainer(opt); setOtherServingsValue('') }}
                    className={`px-3 py-1.5 rounded-md border ${servingsPerContainer === opt ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200'}`}
                  >
                    {opt}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setServingsPerContainer('other')}
                  className={`px-3 py-1.5 rounded-md border ${servingsPerContainer === 'other' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200'}`}
                >
                  Other
                </button>

                {servingsPerContainer === 'other' && (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={otherServingsValue}
                    onChange={(e) => {
                      // Allow numbers with at most one decimal place
                      const v = e.target.value
                      if (v === '' || /^\d+(\.\d?)?$/.test(v)) {
                        setOtherServingsValue(v)
                      }
                    }}
                    placeholder="e.g. 3.5"
                    className="ml-2 px-3 py-1.5 border rounded-md w-24"
                  />
                )}
              </div>
            </div>

            {/* Category selector */}
            <div className="mt-4 bg-white border border-emerald-100 p-4 rounded-md">
              <label className="block text-sm font-medium text-emerald-900 mb-2">Dish Category</label>
              <select
                value={dishCategory}
                onChange={(e) => setDishCategory(e.target.value)}
                className="w-full px-3 py-2 border border-emerald-200 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select category...</option>
                <option value="Breakfast Offerings">Breakfast Offerings</option>
                <option value="The Staples Collection">The Staples Collection</option>
                <option value="The Garden Collection">The Garden Collection</option>
              </select>
            </div>
          </div>
        )}
        
        {/* Errors/Warnings */}
        {parseResult.errors.length > 0 && (
          <div className={`border-2 rounded-xl p-6 mb-6 ${
            parseResult.errors.some(e => !e.startsWith('⚠️'))
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <h3 className={`text-lg font-bold mb-2 ${
              parseResult.errors.some(e => !e.startsWith('⚠️'))
                ? 'text-red-900'
                : 'text-amber-900'
            }`}>
              {parseResult.errors.some(e => !e.startsWith('⚠️')) ? '🚨 Errors & Warnings' : '⚠️ Warnings'}
            </h3>
            <ul className="space-y-2">
              {parseResult.errors.map((error, idx) => (
                <li key={idx} className={`flex items-start gap-2 ${
                  error.startsWith('⚠️') ? 'text-amber-800' : 'text-red-800'
                }`}>
                  <span className="flex-shrink-0">{error.startsWith('⚠️') ? '⚠️' : '❌'}</span>
                  <span>{error.replace(/^⚠️\s*/, '').replace(/^Warning:\s*/i, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Final Dish */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Final Dish:</h2>
            {isEditingDishName ? (
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                onBlur={() => setIsEditingDishName(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingDishName(false)
                  if (e.key === 'Escape') {
                    setDishName(parseResult?.finalDish.name || '')
                    setIsEditingDishName(false)
                  }
                }}
                autoFocus
                className="flex-1 text-2xl font-bold text-gray-900 border-2 border-emerald-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            ) : (
              <>
                <span className="text-2xl font-bold text-emerald-700">{dishName}</span>
                <button
                  onClick={() => setIsEditingDishName(true)}
                  className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  title="Edit recipe name"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="space-y-3">
            {finalDishIngredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {ing.quantity} {ing.unit} {ing.ingredient}
                  </div>
                  {autoSearching ? (
                    <div className="text-sm text-gray-500 mt-1 animate-pulse">
                      🔍 Searching USDA ({searchProgress.current}/{searchProgress.total})...
                    </div>
                  ) : ing.usdaFood ? (
                    <>
                      <div className="text-sm text-green-700 mt-1 font-medium">
                        ✓ USDA Match Selected: {ing.usdaFood.description}
                      </div>
                      {ing.usdaFood.dataQualityWarnings && ing.usdaFood.dataQualityWarnings.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                          <div className="font-semibold text-amber-900 mb-1 flex items-center gap-1">
                            ⚠️ USDA Data Quality Issue
                          </div>
                          {ing.usdaFood.dataQualityWarnings.map((warning, wIdx) => (
                            <div key={wIdx} className="text-amber-800 mb-1">
                              {warning.message}
                            </div>
                          ))}
                          <div className="text-amber-700 mt-1 italic">
                            Values automatically corrected. You can override by selecting a different USDA entry.
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-red-600 mt-1 font-medium">
                      ❌ No match found - please search manually
                    </div>
                  )}
                </div>
                {!autoSearching && (
                  <div className="flex gap-2">
                    {ing.usdaFood ? (
                      // Has a match - show Change button (already auto-confirmed)
                      <button
                        onClick={() => setEditingIngredient({ type: 'final', ingredientIndex: idx })}
                        className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors border border-blue-300"
                      >
                        ✏️ Change
                      </button>
                    ) : (
                      // No match - show Select button
                      <button
                        onClick={() => setEditingIngredient({ type: 'final', ingredientIndex: idx })}
                        className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-medium transition-colors shadow-sm"
                      >
                        🔍 Search USDA
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setModal({
                          isOpen: true,
                          type: 'warning',
                          title: 'Skip Ingredient',
                          message: `Skip USDA match for "${ing.ingredient}"?\n\nThis ingredient will NOT contribute to nutrition calculations. Only skip if:\n• It's a non-food item (garnish, wrapper)\n• Quantity is negligible\n• You'll add nutrition data manually later`,
                          onConfirm: () => {
                            const updated = [...finalDishIngredients]
                            updated[idx] = { ...updated[idx], confirmed: true, usdaFood: null }
                            setFinalDishIngredients(updated)
                          }
                        })
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      title="Skip USDA match - won't contribute to nutrition"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sub-Recipes */}
        {subRecipes.map((sub, subIdx) => (
          <div key={subIdx} className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-blue-900 mb-1 truncate" title={sub.name}>
              Sub-Recipe: {sub.name}
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Uses {sub.quantityInFinalDish} {sub.unitInFinalDish} in final dish
            </p>

            <div className="space-y-3">
              {sub.ingredients.map((ing, ingIdx) => (
                <div key={ingIdx} className="flex items-center gap-4 p-3 bg-white rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {ing.quantity} {ing.unit} {ing.ingredient}
                    </div>
                    {autoSearching ? (
                      <div className="text-sm text-gray-500 mt-1 animate-pulse">
                        🔍 Searching USDA ({searchProgress.current}/{searchProgress.total})...
                      </div>
                    ) : ing.usdaFood ? (
                      <div className="text-sm text-green-700 mt-1 font-medium">
                        ✓ USDA Match Selected: {ing.usdaFood.description}
                      </div>
                    ) : (
                      <div className="text-sm text-red-600 mt-1 font-medium">
                        ❌ No match found - please search manually
                      </div>
                    )}
                  </div>
                  {!autoSearching && (
                    <div className="flex gap-2">
                      {ing.usdaFood ? (
                        // Has a match - show Change button (already auto-confirmed)
                        <button
                          onClick={() => setEditingIngredient({ type: 'sub', subRecipeIndex: subIdx, ingredientIndex: ingIdx })}
                          className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors border border-blue-300"
                        >
                          ✏️ Change
                        </button>
                      ) : (
                        // No match - show Select button
                        <button
                          onClick={() => setEditingIngredient({ type: 'sub', subRecipeIndex: subIdx, ingredientIndex: ingIdx })}
                          className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-medium transition-colors shadow-sm"
                        >
                          🔍 Search USDA
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setModal({
                            isOpen: true,
                            type: 'warning',
                            title: 'Skip Ingredient',
                            message: `Skip USDA match for "${ing.ingredient}"?\n\nThis ingredient will NOT contribute to nutrition calculations. Only skip if:\n• It's a non-food item (garnish, wrapper)\n• Quantity is negligible\n• You'll add nutrition data manually later`,
                            onConfirm: () => {
                              const updated = [...subRecipes]
                              updated[subIdx].ingredients[ingIdx] = { 
                                ...updated[subIdx].ingredients[ingIdx], 
                                confirmed: true, 
                                usdaFood: null 
                              }
                              setSubRecipes(updated)
                            }
                          })
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                        title="Skip USDA match - won't contribute to nutrition"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* USDA Search Modal */}
        {editingIngredient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-6xl w-full h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Select USDA Match
                </h3>
                <button
                  onClick={() => setEditingIngredient(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <IngredientSearch
                onSelectIngredient={handleSelectUSDA}
                initialQuery={
                  editingIngredient.type === 'final'
                    ? finalDishIngredients[editingIngredient.ingredientIndex].searchQuery
                    : subRecipes[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex].searchQuery
                }
              />
            </div>
          </div>
        )}

        {/* Save Progress */}
        {saveProgress && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
              <span className="text-emerald-900 font-medium">{saveProgress}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 sticky bottom-4">
          <button
            onClick={() => router.push('/import')}
            disabled={saving}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back to Import
          </button>

          <button
            onClick={handleSave}
            disabled={!allIngredientsConfirmed() || saving}
            className="flex-1 px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                {allIngredientsConfirmed() ? '✓' : '⚠'} Save Recipe
                <span className="ml-2 text-xs opacity-75">(Ctrl+Enter)</span>
              </>
            )}
          </button>
        </div>
        </main>
      </div>

      {/* Full-Screen Saving Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Saving Recipe...</h3>
              {saveProgress && (
                <p className="text-emerald-700 font-medium">{saveProgress}</p>
              )}
              <p className="text-gray-500 text-sm mt-4">Please wait while we save your nutrition data</p>
            </div>
          </div>
        </div>
      )}

      {/* Batch Ingredient Specification Modal */}
      {batchSpecificationModal.length > 0 && (
        <BatchIngredientSpecificationModal
          ingredients={batchSpecificationModal}
          onConfirm={handleBatchSpecify}
          onSkipAll={handleBatchSkipAll}
          onCancel={handleBatchCancel}
        />
      )}

      {/* Single Ingredient Specification Modal */}
      {specificationModal && (
        <IngredientSpecificationModal
          ingredient={specificationModal.ingredient}
          onSpecify={handleSpecify}
          onSkip={handleSkipSpecification}
          onCancel={handleCancelSpecification}
        />
      )}

      {/* Modal for errors/confirmations */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      {/* Rename Modal for Duplicate Dishes */}
      {renameModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="rename-modal" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
              onClick={() => setRenameModal({ ...renameModal, isOpen: false })}
            ></div>

            {/* Center modal */}
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                {/* Logo at top */}
                <div className="flex justify-center mb-4">
                  <Image 
                    src="/gather_logo.png" 
                    alt="Gather Kitchen" 
                    width={120}
                    height={48}
                    className="h-12 w-auto"
                    priority
                  />
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="rename-modal">
                      Duplicate Dish Name
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        A dish named "{dishName}" already exists. Please choose a different name:
                      </p>
                      
                      <input
                        type="text"
                        value={renameModal.editableName}
                        onChange={(e) => setRenameModal({ ...renameModal, editableName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Enter new dish name"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && renameModal.editableName.trim()) {
                            setDishName(renameModal.editableName.trim())
                            setRenameModal({ isOpen: false, suggestedName: '', editableName: '' })
                            performSave()
                          }
                        }}
                      />
                      
                      <p className="text-xs text-gray-400 mt-2">
                        Suggested: {renameModal.suggestedName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                <button
                  type="button"
                  disabled={!renameModal.editableName.trim()}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    if (renameModal.editableName.trim()) {
                      setDishName(renameModal.editableName.trim())
                      setRenameModal({ isOpen: false, suggestedName: '', editableName: '' })
                      performSave()
                    }
                  }}
                >
                  Save with New Name
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setRenameModal({ isOpen: false, suggestedName: '', editableName: '' })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MobileRestrict>
  )
}
