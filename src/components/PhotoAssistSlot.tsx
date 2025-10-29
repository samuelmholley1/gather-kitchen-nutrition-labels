// Inject PhotoAssist into the review page by wiring the USDAAssist suggestion to IngredientSearch query state.
// This uses the PhotoAssistInjection helper to apply your existing USDA cleaner before setting the input.

'use client'

import dynamic from 'next/dynamic'

// Dynamic import to avoid potential SSR/client mismatches
const PhotoAssistInjection = dynamic(() => import('@/components/PhotoAssistInjection'), { ssr: false })

export default function PhotoAssistSlot({ setSearch }: { setSearch: (q: string) => void }) {
  return (
    <PhotoAssistInjection onSetSearch={setSearch} />
  )
}
