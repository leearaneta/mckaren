import type { Preferences, FacilitySubscription } from '@mckaren/types'

interface SubscriptionRequest {
  email: string;
  subscriptions: {
    facility: string;
    name: string;
    preferences: Omit<Preferences, 'omittedCourts'>;
  }[];
  courtPreferences: {
    [facility: string]: string[];  // omitted courts for each facility
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SubscriptionRequest>(event)
  
  // Validate request
  if (!body.email || !body.subscriptions?.length) {
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

  // Validate each subscription
  for (const sub of body.subscriptions) {
    // Validate days of week
    if (!sub.preferences.daysOfWeek?.length || 
        !sub.preferences.daysOfWeek.every((day: number) => day >= 0 && day <= 6)) {
      throw createError({
        statusCode: 400,
        message: 'Days of week must be between 0 and 6'
      })
    }

    // Validate duration
    if (sub.preferences.minDuration < 30 || 
        sub.preferences.minDuration > 180 || 
        sub.preferences.minDuration % 30 !== 0) {
      throw createError({
        statusCode: 400,
        message: 'Minimum duration must be between 30 and 180 minutes and be a multiple of 30'
      })
    }

    // Validate hours
    if (sub.preferences.minStartTime.hour < 0 || 
        sub.preferences.minStartTime.hour >= 24 || 
        sub.preferences.maxEndTime.hour <= 0 || 
        sub.preferences.maxEndTime.hour > 24 ||
        sub.preferences.maxEndTime.hour <= sub.preferences.minStartTime.hour) {
      throw createError({
        statusCode: 400,
        message: 'Invalid hour range'
      })
    }
  }

  const client = await event.context.pool.connect()
  try {
    await client.query('BEGIN')

    // First, handle court preferences
    for (const [facility, omittedCourts] of Object.entries(body.courtPreferences)) {
      // Upsert court preferences
      await client.query(
        `INSERT INTO facility_court_preferences (email, facility, omitted_courts)
         VALUES ($1, $2, $3)
         ON CONFLICT (email, facility) DO UPDATE
         SET omitted_courts = $3`,
        [body.email, facility, omittedCourts]
      )
    }

    // Then, handle subscriptions
    for (const sub of body.subscriptions) {
      // Create new subscription
      await client.query(
        `INSERT INTO facility_subscriptions (
          email,
          facility,
          name,
          days_of_week,
          minimum_duration,
          start_hour,
          start_minute,
          end_hour,
          end_minute
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          body.email,
          sub.facility,
          sub.name,
          sub.preferences.daysOfWeek,
          sub.preferences.minDuration,
          sub.preferences.minStartTime.hour,
          sub.preferences.minStartTime.minute,
          sub.preferences.maxEndTime.hour,
          sub.preferences.maxEndTime.minute
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