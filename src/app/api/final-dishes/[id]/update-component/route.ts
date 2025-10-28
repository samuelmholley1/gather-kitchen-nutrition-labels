import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!)
    const { componentIndex, quantity, unit, reason } = await request.json()

    if (componentIndex === undefined || !quantity || !unit) {
      return NextResponse.json(
        { error: 'Component index, quantity, and unit are required' },
        { status: 400 }
      )
    }

    // Fetch current dish data
    const records = await base('FinalDishes').select({
      filterByFormula: `{id} = '${params.id}'`
    }).firstPage()

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'Final dish not found' },
        { status: 404 }
      )
    }

    const record = records[0]
    const currentComponents = record.get('Components')

    if (!currentComponents) {
      return NextResponse.json(
        { error: 'No components found for this dish' },
        { status: 400 }
      )
    }

    let components
    try {
      components = typeof currentComponents === 'string'
        ? JSON.parse(currentComponents)
        : currentComponents
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid components data format' },
        { status: 400 }
      )
    }

    if (!Array.isArray(components) || componentIndex < 0 || componentIndex >= components.length) {
      return NextResponse.json(
        { error: 'Invalid component index' },
        { status: 400 }
      )
    }

    // Store edit history in the component
    const component = components[componentIndex]
    const previousQuantity = component.quantity
    const previousUnit = component.unit

    // Initialize editHistory if it doesn't exist
    if (!component.editHistory) {
      component.editHistory = []
    }

    // Add edit to history
    component.editHistory.push({
      timestamp: new Date().toISOString(),
      editedBy: 'User', // Could be enhanced with auth
      previousQuantity,
      previousUnit,
      newQuantity: quantity,
      newUnit: unit,
      reason: reason || 'Manual edit from provenance modal'
    })

    // Update the component
    component.quantity = quantity
    component.unit = unit

    // Update the record in Airtable
    await base('FinalDishes').update(record.id, {
      Components: JSON.stringify(components)
    })

    return NextResponse.json({
      success: true,
      message: 'Component updated successfully',
      updatedComponent: component
    })

  } catch (error) {
    console.error('Update component error:', error)
    return NextResponse.json(
      { error: 'Failed to update component' },
      { status: 500 }
    )
  }
}
