import type { HalfHourOpening, SubscriptionOpening, Facility, Cookies } from '../types';
import type { DurationMinutes } from '@mckaren/types';
import { pool } from '../utils/db';
import { filterHalfHourOpeningsByPreferences, getOpenings } from '@mckaren/openings';

export async function getAllHalfHourOpenings(facility: Facility, cookies: Cookies): Promise<HalfHourOpening[]> {
  const allSlots: HalfHourOpening[] = [];
  const today = new Date();
  
  // Get data for each day up to maxDaysInAdvance
  for (let i = 0; i <= facility.config.maxDaysInAdvance; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    try {
      const slots = await facility.getHalfHourOpeningsForDate(date, cookies);
      allSlots.push(...slots.map(slot => ({ ...slot, facility: facility.config.name })));
    } catch (error) {
      console.error(`Failed to get data for ${date.toDateString()}:`, error);
    }
  }

  // Calculate the max allowed datetime (exactly maxDaysInAdvance * 24 hours from now)
  const maxAllowedTime = new Date(today.getTime() + (facility.config.maxDaysInAdvance * 24 * 60 * 60 * 1000));
  
  // Filter out slots beyond maxDaysInAdvance and sort by datetime
  return allSlots
    .filter(slot => slot.datetime <= maxAllowedTime)
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

export async function getNewSubscriptionOpenings(
  facility: Facility,
  currentHalfHourOpenings: HalfHourOpening[]
): Promise<SubscriptionOpening[]> {
  const client = await pool.connect();
  try {
    // Get previous openings
    const prevHalfHourOpenings = (await client.query<{ court: string; datetime: Date; facility: string }>(`
      SELECT court, datetime, facility
      FROM half_hour_openings
      WHERE facility = $1
    `, [facility.config.name])).rows;

    // Create a set of previous opening keys for fast lookup
    const prevOpeningKeys = new Set(
      prevHalfHourOpenings.map(o => `${o.court}-${o.datetime.toISOString()}`)
    );

    // Find new openings
    const newHalfHourOpenings = currentHalfHourOpenings.filter(opening => {
      const key = `${opening.court}-${opening.datetime.toISOString()}`;
      return !prevOpeningKeys.has(key);
    });
    
    if (newHalfHourOpenings.length === 0) {
      return [];
    }

    // Get all subscription preferences
    type SubscriptionRow = {
      email: string;
      days_of_week: number[];
      minimum_duration: number;
      start_hour: number;
      start_minute: number;
      end_hour: number;
      end_minute: number;
      omitted_courts: string[];
    };

    const subscriptions = await client.query<SubscriptionRow>(`
      SELECT 
        email,
        days_of_week,
        minimum_duration,
        start_hour,
        start_minute,
        end_hour,
        end_minute,
        omitted_courts
      FROM facility_subscriptions
      WHERE facility = $1
    `, [facility.config.name]);

    return subscriptions.rows
      .map((row: SubscriptionRow) => ({
        email: row.email,
        minStartTime: { hour: row.start_hour, minute: row.start_minute as 0 | 30 },
        maxEndTime: { hour: row.end_hour, minute: row.end_minute as 0 | 30 },
        minDuration: row.minimum_duration as DurationMinutes,
        daysOfWeek: row.days_of_week as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
        omittedCourts: row.omitted_courts
      }))
      .map(preferences => ({
        preferences,
        newRelevantHalfHourOpenings: filterHalfHourOpeningsByPreferences(newHalfHourOpenings, preferences)
      }))
      .filter(({ newRelevantHalfHourOpenings }) => newRelevantHalfHourOpenings.length > 0)
      .flatMap(({ preferences, newRelevantHalfHourOpenings }) => {
        const uniqueDates = new Set(newRelevantHalfHourOpenings.map(opening => opening.datetime.toLocaleDateString()));
        return [ ...uniqueDates ].flatMap(date => {
          const prevHalfHourOpeningsForDate = prevHalfHourOpenings.filter(o => o.datetime.toLocaleDateString() === date);
          const filteredPrevHalfHourOpeningsForDate = filterHalfHourOpeningsByPreferences(prevHalfHourOpeningsForDate, preferences);

          const currentHalfHourOpeningsForDate = currentHalfHourOpenings.filter(o => o.datetime.toLocaleDateString() === date);
          const filteredCurrentHalfHourOpeningsForDate = filterHalfHourOpeningsByPreferences(currentHalfHourOpeningsForDate, preferences);

          const prevOpeningsForDate = getOpenings(filteredPrevHalfHourOpeningsForDate, preferences.minDuration);
          const currentOpeningsForDate = getOpenings(filteredCurrentHalfHourOpeningsForDate, preferences.minDuration);

          const currentOpeningKeys = new Set(currentOpeningsForDate.map(o => `${o.startDatetime.toISOString()}-${o.endDatetime.toISOString()}`));
          const newOpeningsForDate = prevOpeningsForDate.filter(o => !currentOpeningKeys.has(`${o.startDatetime.toISOString()}-${o.endDatetime.toISOString()}`));

          return newOpeningsForDate.map(o => ({ ...o, email: preferences.email, facility: facility.config.name }));
        })
      })
  } finally {
    client.release();
  }
}

export async function replaceOpenings(facility: string, halfHourOpenings: HalfHourOpening[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM half_hour_openings WHERE facility = $1', [facility]);

    // Insert new half-hour openings
    for (const slot of halfHourOpenings) {
      await client.query(`
        INSERT INTO half_hour_openings (
          facility,
          court,
          datetime
        ) VALUES ($1, $2, $3)
      `, [facility, slot.court, slot.datetime]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
