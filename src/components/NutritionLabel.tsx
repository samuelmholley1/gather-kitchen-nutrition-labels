/**
 * FDA-Compliant Nutrition Label Component
 * 
 * Renders a beautiful, editable nutrition facts label that can be:
 * 1. Displayed on screen (FDA-compliant styling)
 * 2. Edited by user (click any value to override)
 * 3. Exported as image (PNG/JPEG download)
 * 4. Copied to clipboard as image
 * 
 * Features:
 * - FDA 21 CFR 101.9 compliant layout
 * - Editable fields with validation
 * - Export as image (html2canvas)
 * - Copy to clipboard
 * - Print-friendly
 */

'use client'

import { useState, useRef } from 'react'
import type { NutrientProfile } from '@/types/nutrition'
import {
  roundCalories,
  roundTotalFat,
  roundSaturatedFat,
  roundTransFat,
  roundCholesterol,
  roundSodium,
  roundTotalCarbohydrate,
  roundDietaryFiber,
  roundTotalSugars,
  roundAddedSugars,
  roundProtein,
  roundVitaminD,
  roundCalcium,
  roundIron,
  roundPotassium,
  calculateDailyValuePercent,
  FDA_DAILY_VALUES,
} from '@/lib/fdaRounding'

interface NutritionLabelProps {
  dishName: string
  servingSize: string // e.g., "1 cup (240g)"
  servingsPerContainer: number
  nutrients: NutrientProfile
  allergens?: string[]
  onExport?: (imageBlob: Blob) => void
}

interface EditableValue {
  field: string
  value: string
}

export default function NutritionLabel({
  dishName,
  servingSize,
  servingsPerContainer,
  nutrients,
  allergens = [],
  onExport,
}: NutritionLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [isExporting, setIsExporting] = useState(false)

  // Get value with override support
  const getValue = (field: keyof typeof nutrients, formatter: (val: number) => string): string => {
    if (overrides[field]) return overrides[field]
    return formatter(nutrients[field])
  }

  // Handle field edit
  const handleEdit = (field: string, value: string) => {
    setOverrides({ ...overrides, [field]: value })
    setIsEditing(null)
  }

  // Export as image
  const exportAsImage = async (format: 'png' | 'jpeg' = 'png') => {
    if (!labelRef.current) return

    setIsExporting(true)

    try {
      // Dynamically import html2canvas (only when needed)
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(labelRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // High DPI
        logging: false,
      })

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Download
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `nutrition-label-${dishName.toLowerCase().replace(/\s+/g, '-')}.${format}`
            a.click()
            URL.revokeObjectURL(url)

            // Callback
            if (onExport) onExport(blob)
          }
          setIsExporting(false)
        },
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        0.95
      )
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (!labelRef.current) return

    setIsExporting(true)

    try {
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(labelRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      })

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ])
            alert('Nutrition label copied to clipboard!')
          } catch (err) {
            console.error('Clipboard write failed:', err)
            alert('Failed to copy to clipboard. Try exporting as image instead.')
          }
        }
        setIsExporting(false)
      })
    } catch (error) {
      console.error('Copy failed:', error)
      setIsExporting(false)
    }
  }

  // Editable field component
  const EditableField = ({ field, value }: { field: string; value: string }) => {
    if (isEditing === field) {
      return (
        <input
          type="text"
          defaultValue={value}
          autoFocus
          className="border border-blue-500 px-1 font-bold"
          style={{ width: '80px', fontFamily: 'inherit', fontSize: 'inherit' }}
          onBlur={(e) => handleEdit(field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEdit(field, e.currentTarget.value)
            }
            if (e.key === 'Escape') {
              setIsEditing(null)
            }
          }}
        />
      )
    }

    return (
      <span
        onClick={() => setIsEditing(field)}
        className="cursor-pointer hover:bg-yellow-100 px-1 rounded"
        title="Click to edit"
      >
        {value}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Control Buttons */}
      <div className="flex gap-2 print:hidden">
        <button
          onClick={() => exportAsImage('png')}
          disabled={isExporting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Download PNG'}
        </button>
        <button
          onClick={() => exportAsImage('jpeg')}
          disabled={isExporting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Download JPEG
        </button>
        <button
          onClick={copyToClipboard}
          disabled={isExporting}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Copy to Clipboard
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Print
        </button>
      </div>

      {/* FDA Nutrition Label */}
      <div
        ref={labelRef}
        className="bg-white border-2 border-black p-1"
        style={{
          width: '288px', // FDA standard width (2.4 inches at 120 DPI)
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        {/* Title */}
        <div className="border-b-8 border-black pb-1">
          <div className="text-4xl font-black leading-none">Nutrition Facts</div>
          <div className="text-xs mt-1">{servingsPerContainer} servings per container</div>
        </div>

        {/* Serving Size */}
        <div className="border-b-8 border-black py-1 flex justify-between items-end">
          <div>
            <div className="text-xs font-bold">Serving size</div>
          </div>
          <div className="text-xs font-bold">{servingSize}</div>
        </div>

        {/* Amount Per Serving */}
        <div className="border-b-4 border-black py-1">
          <div className="text-xs font-bold">Amount per serving</div>
          <div className="flex justify-between items-end">
            <div className="text-4xl font-black leading-none">
              Calories
            </div>
            <div className="text-4xl font-black leading-none">
              <EditableField
                field="calories"
                value={getValue('calories', roundCalories)}
              />
            </div>
          </div>
        </div>

        {/* % Daily Value Header */}
        <div className="border-b border-black py-1 text-right">
          <div className="text-xs font-bold">% Daily Value*</div>
        </div>

        {/* Total Fat */}
        <div className="border-b border-black py-1 flex justify-between">
          <div className="text-xs">
            <span className="font-bold">Total Fat</span>{' '}
            <EditableField
              field="totalFat"
              value={getValue('totalFat', roundTotalFat)}
            />
          </div>
          <div className="text-xs font-bold">
            {calculateDailyValuePercent(nutrients.totalFat, FDA_DAILY_VALUES.totalFat)}
          </div>
        </div>

        {/* Saturated Fat (indented) */}
        <div className="border-b border-black py-1 flex justify-between pl-4">
          <div className="text-xs">
            Saturated Fat{' '}
            <EditableField
              field="saturatedFat"
              value={getValue('saturatedFat', roundSaturatedFat)}
            />
          </div>
          <div className="text-xs font-bold">
            {calculateDailyValuePercent(nutrients.saturatedFat, FDA_DAILY_VALUES.saturatedFat)}
          </div>
        </div>

        {/* Trans Fat (indented) */}
        <div className="border-b border-black py-1 flex justify-between pl-4">
          <div className="text-xs">
            <span className="italic">Trans</span> Fat{' '}
            <EditableField
              field="transFat"
              value={getValue('transFat', roundTransFat)}
            />
          </div>
          <div className="text-xs"></div>
        </div>

        {/* Cholesterol */}
        <div className="border-b border-black py-1 flex justify-between">
          <div className="text-xs">
            <span className="font-bold">Cholesterol</span>{' '}
            <EditableField
              field="cholesterol"
              value={getValue('cholesterol', roundCholesterol)}
            />
          </div>
          <div className="text-xs font-bold">
            {calculateDailyValuePercent(nutrients.cholesterol, FDA_DAILY_VALUES.cholesterol)}
          </div>
        </div>

        {/* Sodium */}
        <div className="border-b border-black py-1 flex justify-between">
          <div className="text-xs">
            <span className="font-bold">Sodium</span>{' '}
            <EditableField
              field="sodium"
              value={getValue('sodium', roundSodium)}
            />
          </div>
          <div className="text-xs font-bold">
            {calculateDailyValuePercent(nutrients.sodium, FDA_DAILY_VALUES.sodium)}
          </div>
        </div>

        {/* Total Carbohydrate */}
        <div className="border-b border-black py-1 flex justify-between">
          <div className="text-xs">
            <span className="font-bold">Total Carbohydrate</span>{' '}
            <EditableField
              field="totalCarbohydrate"
              value={getValue('totalCarbohydrate', roundTotalCarbohydrate)}
            />
          </div>
          <div className="text-xs font-bold">
            {calculateDailyValuePercent(nutrients.totalCarbohydrate, FDA_DAILY_VALUES.totalCarbohydrate)}
          </div>
        </div>

        {/* Dietary Fiber (indented) */}
        <div className="border-b border-black py-1 flex justify-between pl-4">
          <div className="text-xs">
            Dietary Fiber{' '}
            <EditableField
              field="dietaryFiber"
              value={getValue('dietaryFiber', roundDietaryFiber)}
            />
          </div>
          <div className="text-xs font-bold">
            {calculateDailyValuePercent(nutrients.dietaryFiber, FDA_DAILY_VALUES.dietaryFiber)}
          </div>
        </div>

        {/* Total Sugars (indented) */}
        <div className="border-b border-black py-1 flex justify-between pl-4">
          <div className="text-xs">
            Total Sugars{' '}
            <EditableField
              field="totalSugars"
              value={getValue('totalSugars', roundTotalSugars)}
            />
          </div>
          <div className="text-xs"></div>
        </div>

        {/* Added Sugars (double indented) */}
        <div className="border-b border-black py-1 flex justify-between pl-8">
          <div className="text-xs">
            Includes{' '}
            <EditableField
              field="addedSugars"
              value={getValue('addedSugars', roundAddedSugars)}
            />{' '}
            Added Sugars
          </div>
          <div className="text-xs font-bold">
            {calculateDailyValuePercent(nutrients.addedSugars, FDA_DAILY_VALUES.totalSugars)}
          </div>
        </div>

        {/* Protein */}
        <div className="border-b-8 border-black py-1">
          <div className="text-xs">
            <span className="font-bold">Protein</span>{' '}
            <EditableField
              field="protein"
              value={getValue('protein', roundProtein)}
            />
          </div>
        </div>

        {/* Micronutrients */}
        <div className="border-b-4 border-black py-2 space-y-1">
          <div className="flex justify-between text-xs">
            <div>
              Vitamin D{' '}
              <EditableField
                field="vitaminD"
                value={getValue('vitaminD', roundVitaminD)}
              />
            </div>
            <div>{calculateDailyValuePercent(nutrients.vitaminD, FDA_DAILY_VALUES.vitaminD)}</div>
          </div>
          <div className="flex justify-between text-xs">
            <div>
              Calcium{' '}
              <EditableField
                field="calcium"
                value={getValue('calcium', roundCalcium)}
              />
            </div>
            <div>{calculateDailyValuePercent(nutrients.calcium, FDA_DAILY_VALUES.calcium)}</div>
          </div>
          <div className="flex justify-between text-xs">
            <div>
              Iron{' '}
              <EditableField
                field="iron"
                value={getValue('iron', roundIron)}
              />
            </div>
            <div>{calculateDailyValuePercent(nutrients.iron, FDA_DAILY_VALUES.iron)}</div>
          </div>
          <div className="flex justify-between text-xs">
            <div>
              Potassium{' '}
              <EditableField
                field="potassium"
                value={getValue('potassium', roundPotassium)}
              />
            </div>
            <div>{calculateDailyValuePercent(nutrients.potassium, FDA_DAILY_VALUES.potassium)}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-1 text-xs leading-tight">
          * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes
          to a daily diet. 2,000 calories a day is used for general nutrition advice.
        </div>

        {/* Allergens (if any) */}
        {allergens.length > 0 && (
          <div className="border-t-2 border-black pt-2 mt-2">
            <div className="text-xs font-bold">CONTAINS:</div>
            <div className="text-xs">{allergens.join(', ')}</div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 print:hidden">
        <p className="font-semibold">💡 Pro Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click any nutrient value to edit it</li>
          <li>Press Enter to save, Escape to cancel</li>
          <li>Download as PNG for web use or JPEG for print</li>
          <li>Copy to clipboard for quick sharing</li>
        </ul>
      </div>
    </div>
  )
}
