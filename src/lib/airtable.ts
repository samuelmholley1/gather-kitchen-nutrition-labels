import Airtable from 'airtable'

// Initialize Airtable with PAT token (gracefully handle missing env vars for build)
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_PAT_TOKEN || 'placeholder_for_build',
})

const base = airtable.base(process.env.AIRTABLE_BASE_ID || 'appPlaceholder')
const table = base(process.env.AIRTABLE_TABLE_NAME || 'liturgists.ukiahumc.org')

export interface SignupData {
  serviceDate: string
  displayDate: string
  name: string
  email: string
  phone?: string
  role: 'Liturgist' | 'Backup' | 'Attendance'
  attendanceStatus?: 'Yes' | 'No' | 'Maybe'
  notes?: string
}

/**
 * Submit a signup to Airtable
 */
export async function submitSignup(data: SignupData) {
  try {
    const record = await table.create([
      {
        fields: {
          'Service Date': data.serviceDate,
          'Display Date': data.displayDate,
          'Name': data.name,
          'Email': data.email,
          'Phone': data.phone || '',
          'Role': data.role,
          'Attendance Status': data.attendanceStatus || '',
          'Notes': data.notes || '',
          'Submitted At': new Date().toISOString(),
        },
      },
    ])

    return { success: true, record: record[0] }
  } catch (error) {
    console.error('Error submitting to Airtable:', error)
    return { success: false, error }
  }
}

/**
 * Get all signups from Airtable
 */
export async function getSignups() {
  try {
    const records = await table.select().all()
    
    return records.map((record) => ({
      id: record.id,
      serviceDate: record.get('Service Date'),
      displayDate: record.get('Display Date'),
      name: record.get('Name'),
      email: record.get('Email'),
      phone: record.get('Phone'),
      role: record.get('Role'),
      attendanceStatus: record.get('Attendance Status'),
      notes: record.get('Notes'),
      submittedAt: record.get('Submitted At'),
    }))
  } catch (error) {
    console.error('Error fetching from Airtable:', error)
    return []
  }
}

export { table }
