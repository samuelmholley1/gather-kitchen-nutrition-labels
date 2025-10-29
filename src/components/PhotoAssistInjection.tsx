// Lightweight integration of USDAAssist into the review page
// Wires photo-based suggestion into the USDA search input state

'use client'

import { useEffect, useState } from 'react'
import USDAAssist from '@/components/USDAAssist'
import { cleanIngredientForUSDASearch } from '@/lib/smartRecipeParser'

export default function PhotoAssistInjection({ onSetSearch }: { onSetSearch: (q: string) => void }) {
  const [last, setLast] = useState<string>('')

  useEffect(() => {
    if (!last) return
    const cleaned = cleanIngredientForUSDASearch(last)
    onSetSearch(cleaned)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last])

  return (
    <div className="mb-6">
      <USDAAssist onSuggestion={(q) => setLast(q)} />
    </div>
  )
}
