import type { PoolClient } from '@mckaren/db';
import type { DurationMinutes, Preferences } from '@mckaren/types';
import { filterHalfHourOpeningsByPreferences, getOpenings } from '@mckaren/openings';
import type { HalfHourOpening, Opening, Facility, Headers } from '../types';

export async function getAllHalfHourOpenings(facility: Facility, headers: Headers): Promise<HalfHourOpening[]> {
  const allSlots: HalfHourOpening[] = [];
  const today = new Date();
  
  // Get data for each day up to maxDaysInAdvance
  for (let i = 0; i <= facility.config.maxDaysInAdvance; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    try {
      const slots = await facility.getHalfHourOpeningsForDate(date, headers);
      allSlots.push(...slots.map(slot => ({ ...slot, facility: facility.config.name })));
    } catch (error) {
      console.error(`Failed to get data for ${date.toDateString()}:`, error);
    }
  }

  // Calculate the max allowed datetime (exactly maxDaysInAdvance * 24 hours from now)
  const maxAllowedTime = new Date(today.getTime() + (facility.config.maxDaysInAdvance * 24 * 60 * 60 * 1000));
  const minAllowedTime = new Date(today.getTime())
  // Filter out slots beyond maxDaysInAdvance and sort by datetime
  return allSlots
    .filter(slot => slot.datetime >= minAllowedTime)
    .filter(slot => slot.datetime <= maxAllowedTime)
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

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

type FormattedSubscription = {
  email: string;
  preferences: Preferences;
};

function formatSubscriptionRows(rows: SubscriptionRow[]): FormattedSubscription[] {
  return rows.map(row => ({
    email: row.email,
    preferences: {
      minStartTime: { hour: row.start_hour, minute: row.start_minute as 0 | 30 },
      maxEndTime: { hour: row.end_hour, minute: row.end_minute as 0 | 30 },
      minDuration: row.minimum_duration as DurationMinutes,
      daysOfWeek: row.days_of_week as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
      omittedCourts: row.omitted_courts
    }
  }));
}

export function processSubscriptionOpenings(
  subscriptions: FormattedSubscription[],
  facility: string,
  currentHalfHourOpenings: HalfHourOpening[],
  prevHalfHourOpenings: HalfHourOpening[]
): Record<string, Opening[]> {
  // Group all openings by email
  const openingsByEmail: Record<string, Opening[]> = {};

  // Process each subscription
  subscriptions.forEach(({ email, preferences }) => {
    // Filter and convert previous half-hour openings to full openings
    const filteredPrevHalfHourOpenings = filterHalfHourOpeningsByPreferences(prevHalfHourOpenings, preferences);
    const prevOpenings = getOpenings(filteredPrevHalfHourOpenings, preferences.minDuration)
      .map(o => ({ ...o, facility }));

    // Filter and convert current half-hour openings to full openings
    const filteredCurrentHalfHourOpenings = filterHalfHourOpeningsByPreferences(currentHalfHourOpenings, preferences);
    const currentOpenings = getOpenings(filteredCurrentHalfHourOpenings, preferences.minDuration)
      .map(o => ({ ...o, facility }));

    // Create a set of previous opening keys for fast lookup
    const prevOpeningKeys = new Set(
      prevOpenings.map(o => `${o.startDatetime.toISOString()}-${o.endDatetime.toISOString()}`)
    );

    // Find new openings (ones that are in current but not in prev)
    const newOpenings = currentOpenings.filter(opening => {
      const key = `${opening.startDatetime.toISOString()}-${opening.endDatetime.toISOString()}`;
      return !prevOpeningKeys.has(key);
    });

    if (newOpenings.length > 0) {
      // Initialize array for this email if it doesn't exist
      if (!openingsByEmail[email]) {
        openingsByEmail[email] = [];
      }

      // Add new openings to the email's collection
      openingsByEmail[email].push(...newOpenings);
    }
  });

  // Deduplicate openings for each email
  Object.keys(openingsByEmail).forEach(email => {
    const seen = new Set<string>();
    openingsByEmail[email] = openingsByEmail[email].filter(opening => {
      const key = `${opening.startDatetime.toISOString()}-${opening.endDatetime.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  return openingsByEmail;
}

export async function getNewSubscriptionOpenings(
  client: PoolClient,
  facility: Facility,
  currentHalfHourOpenings: HalfHourOpening[]
): Promise<Record<string, Opening[]>> {
  try {
    // Get previous openings
    const prevHalfHourOpenings = (await client.query<{ court: string; datetime: Date; facility: string }>(`
      SELECT court, datetime, facility
      FROM half_hour_openings
      WHERE facility = $1
    `, [facility.config.name])).rows;

    const subscriptions = await client.query<SubscriptionRow>(`
      SELECT 
        s.email,
        s.days_of_week,
        s.minimum_duration,
        s.start_hour,
        s.start_minute,
        s.end_hour,
        s.end_minute,
        p.omitted_courts
      FROM facility_subscriptions s
      JOIN facility_court_preferences p 
        ON s.email = p.email 
        AND s.facility = p.facility
      WHERE s.facility = $1
    `, [facility.config.name]);

    const formattedSubscriptions = formatSubscriptionRows(subscriptions.rows);
    return processSubscriptionOpenings(
      formattedSubscriptions,
      facility.config.name,
      currentHalfHourOpenings,
      prevHalfHourOpenings
    );
  } catch (error) {
    throw error;
  }
}

export async function replaceOpenings(
  client: PoolClient,
  facility: string,
  halfHourOpenings: HalfHourOpening[]
): Promise<void> {
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
  }
}
