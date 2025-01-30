import type { Preferences } from '@mckaren/types'
import { pool } from '~/server/utils/db'

interface SubscriptionRequest {
  email: string;
  subscriptions: {
    facility: string;
    preferences: Omit<Preferences, 'omittedCourts'>;
  }[];
  omittedCourts: {
    [facility: string]: string[];  // omitted courts for each facility
  };
}

// Helper function to get parameter index for each subscription field
function getParamIndex(subscriptionIndex: number, field: 'daysOfWeek' | 'minDuration' | 'startHour' | 'startMinute' | 'endHour' | 'endMinute'): number {
  const FIELDS_PER_SUBSCRIPTION = 6
  const fieldIndices = {
    daysOfWeek: 2,
    minDuration: 3,
    startHour: 4,
    startMinute: 5,
    endHour: 6,
    endMinute: 7
  }
  return subscriptionIndex * FIELDS_PER_SUBSCRIPTION + fieldIndices[field]
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
    if (sub.preferences.minDuration < 60 || 
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

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // First, delete all existing subscriptions and preferences for this email
    await client.query(
      `DELETE FROM facility_court_preferences WHERE email = $1`,
      [body.email]
    )
    await client.query(
      `DELETE FROM facility_subscriptions WHERE email = $1`,
      [body.email]
    )

    // Create court preferences for all facilities in subscriptions
    const facilitiesNeeded = new Set(body.subscriptions.map(sub => sub.facility))
    const courtPrefsValues = Array.from(facilitiesNeeded)
      .map((_, idx) => `($1, $${idx * 2 + 2}, $${idx * 2 + 3}::text[])`)
      .join(', ')
    
    const courtPrefsParams = [
      body.email,
      ...Array.from(facilitiesNeeded).flatMap(facility => [
        facility,
        body.omittedCourts[facility] || []
      ])
    ]

    await client.query(
      `INSERT INTO facility_court_preferences (email, facility, omitted_courts)
       VALUES ${courtPrefsValues}`,
      courtPrefsParams
    )

    // Insert all subscriptions in one query
    if (body.subscriptions.length > 0) {
      const subscriptionValues = body.subscriptions.map(
        (sub, idx) => `(
          $1,
          ${client.escapeLiteral(sub.facility)},
          $${getParamIndex(idx, 'daysOfWeek')}::integer[],
          $${getParamIndex(idx, 'minDuration')}::integer,
          $${getParamIndex(idx, 'startHour')}::integer,
          $${getParamIndex(idx, 'startMinute')}::integer,
          $${getParamIndex(idx, 'endHour')}::integer,
          $${getParamIndex(idx, 'endMinute')}::integer
        )`
      ).join(', ')

      const subscriptionParams = [
        body.email,
        ...body.subscriptions.flatMap(sub => [
          sub.preferences.daysOfWeek,
          sub.preferences.minDuration,
          sub.preferences.minStartTime.hour,
          sub.preferences.minStartTime.minute,
          sub.preferences.maxEndTime.hour,
          sub.preferences.maxEndTime.minute
        ])
      ]

      await client.query(
        `INSERT INTO facility_subscriptions (
          email,
          facility,
          days_of_week,
          minimum_duration,
          start_hour,
          start_minute,
          end_hour,
          end_minute
        ) VALUES ${subscriptionValues}`,
        subscriptionParams
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