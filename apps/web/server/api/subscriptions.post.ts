import { pool } from '../utils/db'

interface SubscriptionRequest {
  email: string
  facilities: string[]
  daysOfWeek: number[]
  minimumDuration: number
  startHour: number
  endHour: number
  omittedCourts: Record<string, string[]>
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SubscriptionRequest>(event)
  
  // Validate request
  if (!body.email || !body.facilities?.length || !body.daysOfWeek?.length) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields'
    })
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email format'
    })
  }

  // Validate days of week
  if (!body.daysOfWeek.every(day => day >= 0 && day <= 6)) {
    throw createError({
      statusCode: 400,
      message: 'Days of week must be between 0 and 6'
    })
  }

  // Validate duration
  if (body.minimumDuration < 30 || body.minimumDuration > 180 || body.minimumDuration % 30 !== 0) {
    throw createError({
      statusCode: 400,
      message: 'Minimum duration must be between 30 and 180 minutes and be a multiple of 30'
    })
  }

  // Validate hours
  if (body.startHour < 0 || body.startHour >= 24 || 
      body.endHour <= 0 || body.endHour > 24 ||
      body.endHour <= body.startHour) {
    throw createError({
      statusCode: 400,
      message: 'Invalid hour range'
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const facility of body.facilities) {
      // Delete existing subscription if any
      await client.query(
        'DELETE FROM facility_subscriptions WHERE email = $1 AND facility = $2',
        [body.email, facility]
      )

      // Create new subscription
      await client.query(
        `INSERT INTO facility_subscriptions (
          email,
          facility,
          days_of_week,
          minimum_duration,
          start_hour,
          end_hour,
          omitted_courts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          body.email,
          facility,
          body.daysOfWeek,
          body.minimumDuration,
          body.startHour,
          body.endHour,
          body.omittedCourts[facility] || []
        ]
      )
    }

    await client.query('COMMIT')
    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creating subscriptions:', error)
    throw createError({
      statusCode: 500,
      message: 'Error creating subscriptions'
    })
  } finally {
    client.release()
  }
}) 