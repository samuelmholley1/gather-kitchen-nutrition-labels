import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import vision from '@google-cloud/vision'

// ============================================================================
// NUTRITION DATA EXTRACTION
// ============================================================================

/**
 * Extract structured nutrition data from OCR text
 */
function extractNutritionData(ocrText: string) {
  const text = ocrText.toLowerCase()

  // Extract product name (usually first line or prominent text)
  const lines = ocrText.split('\n').filter(line => line.trim().length > 0)
  const productName = lines[0]?.trim() || 'Unknown Product'

  // Extract serving size
  const servingMatch = text.match(/serving size[:\s]*([^0-9]*\d+\s*(?:g|mg|ml|oz|cup|tbsp|tsp))/i)
  const servingSize = servingMatch ? servingMatch[1].trim() : '1 serving'

  // Extract nutrients
  const nutrients: Record<string, number> = {}

  // Calories
  const calorieMatch = text.match(/calories?\s*:?\s*(\d+)/i)
  if (calorieMatch) nutrients.calories = parseInt(calorieMatch[1])

  // Fat
  const fatMatch = text.match(/total fat\s*:?\s*(\d+(?:\.\d+)?)\s*g/i)
  if (fatMatch) nutrients.totalFat = parseFloat(fatMatch[1])

  // Protein
  const proteinMatch = text.match(/protein\s*:?\s*(\d+(?:\.\d+)?)\s*g/i)
  if (proteinMatch) nutrients.protein = parseFloat(proteinMatch[1])

  // Carbohydrates
  const carbMatch = text.match(/total carbohydrate\s*:?\s*(\d+(?:\.\d+)?)\s*g/i)
  if (carbMatch) nutrients.totalCarbohydrate = parseFloat(carbMatch[1])

  // Sodium
  const sodiumMatch = text.match(/sodium\s*:?\s*(\d+(?:\.\d+)?)\s*mg/i)
  if (sodiumMatch) nutrients.sodium = parseFloat(sodiumMatch[1])

  return {
    name: productName,
    servingSize,
    nutrients
  }
}

/**
 * Generate a USDA search query from OCR text and extracted data
 */
function generateSearchQuery(ocrText: string, extractedData: any): string {
  const text = ocrText.toLowerCase()

  // Start with product name
  let query = extractedData.name

  // Add qualifiers based on content
  const qualifiers = []

  if (text.includes('organic')) qualifiers.push('organic')
  if (text.includes('gluten free') || text.includes('gluten-free')) qualifiers.push('gluten free')
  if (text.includes('low sodium') || text.includes('reduced sodium')) qualifiers.push('low sodium')
  if (text.includes('extra virgin')) qualifiers.push('extra virgin')
  if (text.includes('raw')) qualifiers.push('raw')
  if (text.includes('whole')) qualifiers.push('whole')

  // Add brand hints
  if (text.includes('san-j')) qualifiers.push('san-j')
  if (text.includes('hellmann')) qualifiers.push('hellmanns')

  // Combine and clean
  if (qualifiers.length > 0) {
    query += ' ' + qualifiers.join(' ')
  }

  // Clean up the query
  return query
    .replace(/[^\w\s-]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .substring(0, 100) // Limit length
}

// MVP Photo Analysis API
// Now uses Google Vision API for superior OCR accuracy on nutrition labels
export async function POST(req: NextRequest) {
  try {
    // Check for multipart form data (Google Vision API approach)
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('image') as File
      const fileName = formData.get('fileName') as string

      if (!file) {
        return NextResponse.json({
          ok: false,
          error: 'No image file provided'
        }, { status: 400 })
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({
          ok: false,
          error: 'File must be an image'
        }, { status: 400 })
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({
          ok: false,
          error: 'Image must be smaller than 5MB'
        }, { status: 400 })
      }

      console.log(`[PhotoAnalysis] Processing image: ${fileName || 'unnamed'} (${(file.size / 1024).toFixed(1)}KB)`)

      try {
        // Initialize Google Vision client
        const client = new vision.ImageAnnotatorClient({
          credentials: JSON.parse(process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY || '{}'),
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        })

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const imageBuffer = Buffer.from(bytes)

        // Perform OCR with Google Vision API
        const [result] = await client.textDetection({
          image: { content: imageBuffer }
        })

        const detections = result.textAnnotations
        const ocrText = detections?.[0]?.description || ''

        if (!ocrText) {
          return NextResponse.json({
            ok: false,
            error: 'No text detected in image'
          }, { status: 400 })
        }

        console.log(`[PhotoAnalysis] OCR completed - extracted ${ocrText.length} characters`)

        // Extract structured data from OCR text
        const extractedData = extractNutritionData(ocrText)
        const suggestedQuery = generateSearchQuery(ocrText, extractedData)

        const response = {
          ocrText: ocrText.trim(),
          suggestedQuery,
          extractedData
        }

        return NextResponse.json({
          ok: true,
          ...response,
          meta: {
            timestamp: new Date().toISOString(),
            fileName: fileName || 'unknown',
            ocrProvider: 'google-vision-api',
            textLength: ocrText.length
          }
        })

      } catch (visionError: any) {
        console.error('[PhotoAnalysis] Google Vision API error:', visionError)

        // Handle specific Google Vision errors
        if (visionError.code === 7) {
          return NextResponse.json({
            ok: false,
            error: 'Google Vision API quota exceeded. Please try again later.'
          }, { status: 429 })
        }

        return NextResponse.json({
          ok: false,
          error: `OCR processing failed: ${visionError.message}`
        }, { status: 500 })
      }
    }

    // Fallback: Accept JSON with base64 for backward compatibility (limited functionality)
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { imageBase64, fileName } = body || {}

      if (!imageBase64) {
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

      return NextResponse.json({
        ok: false,
        error: 'Base64 input deprecated. Please use multipart/form-data for full OCR functionality.'
      }, { status: 400 })
    }

    return NextResponse.json({
      ok: false,
      error: 'Content-Type must be multipart/form-data'
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