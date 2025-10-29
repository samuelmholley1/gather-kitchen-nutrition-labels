import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// MVP Photo Analysis API
// Currently returns stubbed OCR results to wire UI
// TODO: Replace with actual OCR provider (Tesseract.js, Google Vision API, etc.)
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    
    // Accept JSON with base64 image for MVP
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { imageBase64, fileName } = body || {}
      
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return NextResponse.json({
          ok: false,
          error: 'Missing imageBase64 in request body'
        }, { status: 400 })
      }

      // Validate base64 format
      if (!imageBase64.match(/^[A-Za-z0-9+/]+=*$/)) {
        return NextResponse.json({
          ok: false,
          error: 'Invalid base64 format'
        }, { status: 400 })
      }

      // Mock OCR analysis for MVP - replace with real OCR
      const mockOCRResults = [
        {
          pattern: /soy|tamari/i,
          ocrText: 'San-J Tamari Soy Sauce\nGluten Free\nServing Size: 1 tbsp (15mL)\nSodium: 230mg\nProtein: 1g',
          suggestedQuery: 'soy sauce tamari gluten free',
          extractedData: {
            name: 'Tamari Soy Sauce (Gluten-Free)',
            servingSize: '1 tbsp (15mL)',
            nutrients: { sodium: 230, protein: 1 }
          }
        },
        {
          pattern: /olive|oil/i,
          ocrText: 'Extra Virgin Olive Oil\nServing Size: 1 tbsp (14g)\nTotal Fat: 14g\nCalories: 120',
          suggestedQuery: 'olive oil extra virgin',
          extractedData: {
            name: 'Extra Virgin Olive Oil',
            servingSize: '1 tbsp (14g)',
            nutrients: { totalFat: 14, calories: 120 }
          }
        },
        {
          pattern: /cheese/i,
          ocrText: 'Organic Sharp Cheddar Cheese\nServing Size: 1 oz (28g)\nCalories: 110\nTotal Fat: 9g\nProtein: 7g',
          suggestedQuery: 'cheddar cheese sharp',
          extractedData: {
            name: 'Sharp Cheddar Cheese (Organic)',
            servingSize: '1 oz (28g)',
            nutrients: { calories: 110, totalFat: 9, protein: 7 }
          }
        }
      ]

      // Simple pattern matching for demo
      const mockResult = mockOCRResults.find(result => 
        fileName && result.pattern.test(fileName)
      ) || {
        ocrText: 'Nutrition Facts\nServing Size: 1 serving\nCalories: 100\n\n[OCR analysis in progress - this is mock data]',
        suggestedQuery: 'food ingredient',
        extractedData: {
          name: 'Ingredient (Brand Name)',
          servingSize: '1 serving',
          nutrients: { calories: 100 }
        }
      }

      console.log(`[PhotoAnalysis] Processed image: ${fileName || 'unnamed'}`)
      
      return NextResponse.json({
        ok: true,
        ...mockResult,
        // Metadata for debugging
        meta: {
          timestamp: new Date().toISOString(),
          fileName: fileName || 'unknown',
          ocrProvider: 'mock-mvp'
        }
      })
    }

    return NextResponse.json({
      ok: false,
      error: 'Content-Type must be application/json for MVP'
    }, { status: 415 })
    
  } catch (error: any) {
    console.error('[PhotoAnalysis] Error:', error)
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'photo-analysis',
    version: 'mvp-1.0',
    status: 'ready'
  })
}