import type { Preferences } from '@mckaren/types'

interface SubscriptionRequest {
  email: string
  facilities: string[]
  preferences: Preferences
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SubscriptionRequest>(event)
  
  // Validate request
  if (!body.email || !body.facilities?.length) {
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
  if (!body.preferences.daysOfWeek?.length || 
      !body.preferences.daysOfWeek.every(day => day >= 0 && day <= 6)) {
    throw createError({
      statusCode: 400,
      message: 'Days of week must be between 0 and 6'
    })
  }

  // Validate duration
  if (body.preferences.minDuration < 30 || 
      body.preferences.minDuration > 180 || 
      body.preferences.minDuration % 30 !== 0) {
    throw createError({
      statusCode: 400,
      message: 'Minimum duration must be between 30 and 180 minutes and be a multiple of 30'
    })
  }

  // Validate hours
  if (body.preferences.minStartTime.hour < 0 || 
      body.preferences.minStartTime.hour >= 24 || 
      body.preferences.maxEndTime.hour <= 0 || 
      body.preferences.maxEndTime.hour > 24 ||
      body.preferences.maxEndTime.hour <= body.preferences.minStartTime.hour) {
    throw createError({
      statusCode: 400,
      message: 'Invalid hour range'
    })
  }

  const client = await event.context.pool.connect()
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
          start_minute,
          end_hour,
          end_minute,
          omitted_courts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          body.email,
          facility,
          body.preferences.daysOfWeek,
          body.preferences.minDuration,
          body.preferences.minStartTime.hour,
          body.preferences.minStartTime.minute,
          body.preferences.maxEndTime.hour,
          body.preferences.maxEndTime.minute,
          body.preferences.omittedCourts[facility as keyof typeof body.preferences.omittedCourts] || []
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