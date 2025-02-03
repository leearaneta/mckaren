import type { Preferences } from '@mckaren/types'
import { pool } from '~/server/utils/db'

interface SubscriptionRequest {
  email: string;
  subscriptions: {
    name: string;
    facilities: string[];
    preferences: Omit<Preferences, 'omittedCourts'>;
  }[];
  omittedCourts: {
    [facility: string]: string[];  // omitted courts for each facility
  };
}

// Helper function to get parameter index for each subscription field
function getParamIndex(subscriptionIndex: number, field: 'name' | 'daysOfWeek' | 'minDuration' | 'startHour' | 'startMinute' | 'endHour' | 'endMinute'): number {
  const FIELDS_PER_SUBSCRIPTION = 7
  const fieldIndices = {
    name: 2,
    daysOfWeek: 3,
    minDuration: 4,
    startHour: 5,
    startMinute: 6,
    endHour: 7,
    endMinute: 8
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
    // Delete subscriptions - facility_subscriptions will be deleted automatically via cascade
    await client.query(
      `DELETE FROM subscriptions WHERE email = $1`,
      [body.email]
    )

    // Create court preferences for all facilities in subscriptions
    const facilitiesNeeded = new Set(body.subscriptions.map(sub => sub.facilities).flat())
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
        (_, idx) => `(
          $1,
          $${getParamIndex(idx, 'name')},
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
          sub.name || '',
          sub.preferences.daysOfWeek,
          sub.preferences.minDuration,
          sub.preferences.minStartTime.hour,
          sub.preferences.minStartTime.minute,
          sub.preferences.maxEndTime.hour,
          sub.preferences.maxEndTime.minute
        ])
      ]

      const insertedSubscriptions = await client.query(
        `INSERT INTO subscriptions (
          email,
          name,
          days_of_week,
          minimum_duration,
          start_hour,
          start_minute,
          end_hour,
          end_minute
        ) VALUES ${subscriptionValues}
        RETURNING id`,
        subscriptionParams
      )

      // Create facility_subscriptions join records
      const { values: facilitySubscriptionValues } = body.subscriptions.reduce((acc, sub) => ({
        paramCounter: acc.paramCounter + sub.facilities.length * 2,
        values: [
          ...acc.values,
          ...sub.facilities.map((_, i) => 
            `($${acc.paramCounter + i * 2}, $${acc.paramCounter + i * 2 + 1})`
          )
        ]
      }), { paramCounter: 1, values: [] as string[] });

      const facilitySubscriptionParams = body.subscriptions.flatMap((sub, subIndex) => {
        const subscriptionId = insertedSubscriptions.rows[subIndex].id;
        return sub.facilities.flatMap(facility => [
          facility,
          subscriptionId
        ]);
      });

      await client.query(
        `INSERT INTO facility_subscriptions (
          facility,
          subscription_id
        ) VALUES ${facilitySubscriptionValues.join(', ')}`,
        facilitySubscriptionParams
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