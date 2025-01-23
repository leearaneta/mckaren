import type { HalfHourOpening, Opening, Facility, Cookies } from '../types';
import { pool } from '../utils/db';

export async function getAllHalfHourOpenings(facility: Facility, cookies: Cookies): Promise<Omit<HalfHourOpening, 'facility'>[]> {
  const allSlots: Omit<HalfHourOpening, 'facility'>[] = [];
  const today = new Date();
  
  // Get data for each day up to maxDaysInAdvance
  for (let i = 0; i <= facility.config.maxDaysInAdvance; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    try {
      const slots = await facility.getHalfHourOpeningsForDate(date, cookies);
      allSlots.push(...slots);
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

const VALID_LENGTHS = [60, 90, 120, 150, 180] as const;


export function getOpenings(facility: string, courtTimes: Omit<HalfHourOpening, 'facility'>[]): Opening[] {
  // Create unique 30-minute openings directly from courtTimes
  const thirtyMinOpenings = Object.values(
    courtTimes.reduce((acc, slot) => ({
      ...acc,
      [slot.datetime.getTime()]: {
        startDatetime: slot.datetime,
        endDatetime: new Date(slot.datetime.getTime() + 30 * 60 * 1000),
      }
    }), {} as Record<number, { startDatetime: Date; endDatetime: Date }>)
  );

  const openings: Opening[] = [];

  // For each valid length
  VALID_LENGTHS.forEach(minuteLength => {
    const previousLength = minuteLength - 30;
    
    // Look through openings of the previous length
    const previousOpenings = previousLength === 30 
      ? thirtyMinOpenings  // Start with 30-min slots
      : openings.filter(o => o.minuteLength === previousLength);
    
    previousOpenings.forEach(prevOpening => {
      const nextSlotStart = prevOpening.endDatetime;
      
      // Check if there's a 30-min opening that starts right after
      const hasNextSlot = thirtyMinOpenings.some(opening => 
        opening.startDatetime.getTime() === nextSlotStart.getTime()
      );
      
      if (hasNextSlot) {
        const start = prevOpening.startDatetime;
        const end = new Date(nextSlotStart.getTime() + 30 * 60 * 1000);
        

        openings.push({
          facility,
          startDatetime: start,
          endDatetime: end,
          minuteLength
        });
      }
    });
  });

  return openings.sort((a, b) => 
    a.startDatetime.getTime() - b.startDatetime.getTime()
  );
}

export async function getNewOpenings(facility: string, openings: Opening[]): Promise<Opening[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<{
      facility: string;
      start_datetime: Date;
      minute_length: number;
    }>(`
      SELECT facility, start_datetime, minute_length
      FROM openings
      WHERE facility = $1
    `, [facility]);

    // Create nested index of existing openings using reduce
    const existingOpenings = result.rows.reduce<Record<string, Record<number, boolean>>>(
      (acc, row) => {
        const startDatetime = row.start_datetime.getTime();
        return {
          ...acc,
          [startDatetime]: {
            ...(acc[startDatetime] || {}),
            [row.minute_length]: true
          }
        };
      },
      {}
    );
    // Filter out openings that already exist
    const newOpenings = openings.filter(opening => {
      const timeIndex = existingOpenings[opening.startDatetime.getTime()];
      return !timeIndex || !timeIndex[opening.minuteLength];
    });
    return newOpenings
  } finally {
    client.release();
  }
}

export async function replaceOpenings(
  facility: string,
  openings: Opening[],
  halfHourOpenings: Omit<HalfHourOpening, 'facility'>[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing openings for this facility
    await client.query('DELETE FROM openings WHERE facility = $1', [facility]);
    await client.query('DELETE FROM half_hour_openings WHERE facility = $1', [facility]);

    // Insert new openings
    for (const opening of openings) {
      await client.query(`
        INSERT INTO openings (
          facility,
          minute_length,
          start_datetime,
          end_datetime,
        ) VALUES ($1, $2, $3, $4)
      `, [
        facility,
        opening.minuteLength,
        opening.startDatetime,
        opening.endDatetime,
      ]);
    }

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
