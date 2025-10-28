import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'

// Initialize Airtable lazily to avoid build-time errors
const getBase = () => {
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID!
  )
}

interface USDAMatchUpdate {
  componentIndex: number
  fdcId: number
  name: string
  dataType: string
  reason: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const base = getBase()
    const body: USDAMatchUpdate = await request.json()
    const { componentIndex, fdcId, name, dataType, reason } = body

    if (componentIndex === undefined || !fdcId || !name || !dataType || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch current record
    const record = await base('Final Dishes').find(params.id)
    const componentsData = record.get('Components') as string | undefined
    
    if (!componentsData) {
      return NextResponse.json(
        { error: 'No components found' },
        { status: 404 }
      )
    }

    const components = JSON.parse(componentsData)
    
    if (!components[componentIndex]) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      )
    }

    const component = components[componentIndex]
    const previousUSDA = component.selectedUSDA

    // Update USDA match
    component.selectedUSDA = {
      fdcId,
      name,
      dataType,
      description: name
    }

    // Track in edit history
    if (!component.editHistory) {
      component.editHistory = []
    }

    component.editHistory.push({
      timestamp: new Date().toISOString(),
      editedBy: 'user',
      type: 'usda_match_change',
      previousUSDA: {
        fdcId: previousUSDA?.fdcId,
        name: previousUSDA?.name,
        dataType: previousUSDA?.dataType
      },
      newUSDA: {
        fdcId,
        name,
        dataType
      },
      reason
    })

    // Update Airtable
    await base('Final Dishes').update(params.id, {
      Components: JSON.stringify(components)
    })

    return NextResponse.json({ 
      success: true,
      message: 'USDA match updated successfully'
    })
  } catch (error) {
    console.error('Error updating USDA match:', error)
    return NextResponse.json(
      { error: 'Failed to update USDA match' },
      { status: 500 }
    )
  }
}
