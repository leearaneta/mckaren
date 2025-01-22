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
    .filter(slot => new Date(slot.datetime) <= maxAllowedTime)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
}

const VALID_LENGTHS = [60, 90, 120, 150, 180] as const;

interface CourtReservation {
  court: string;
  startDatetime: string;
  endDatetime: string;
}

/**
 * Given a time range and available 30-min slots, find the minimum set of court reservations
 * that cover the entire range
 */
function findMinimumCourtReservations(
  startTime: Date,
  endTime: Date,
  availableSlots: Omit<HalfHourOpening, 'facility'>[]
): CourtReservation[] {
  // First get all possible court reservations (consecutive slots for each court)
  const allReservations = getPossibleReservations(startTime, endTime, availableSlots);
  
  // Generate all 30-min time slots we need to cover
  const targetSlots: number[] = [];
  let current = startTime.getTime();
  while (current < endTime.getTime()) {
    targetSlots.push(current);
    current += 30 * 60 * 1000;
  }

  // For each reservation, track which time slots it covers
  const reservationCoverage = allReservations.map(reservation => {
    const covered: number[] = [];
    let time = new Date(reservation.startDatetime).getTime();
    const end = new Date(reservation.endDatetime).getTime();
    while (time < end) {
      covered.push(time);
      time += 30 * 60 * 1000;
    }
    return {
      reservation,
      coveredSlots: covered
    };
  });

  // Greedy set cover algorithm:
  // 1. Pick the reservation that covers the most uncovered slots
  // 2. Repeat until all slots are covered
  const solution: CourtReservation[] = [];
  const coveredSlots = new Set<number>();

  while (coveredSlots.size < targetSlots.length) {
    let bestReservation: CourtReservation | null = null;
    let maxNewCovered = 0;

    for (const {reservation, coveredSlots: slots} of reservationCoverage) {
      // Count how many new slots this reservation would cover
      const newCovered = slots.filter(slot => !coveredSlots.has(slot)).length;
      if (newCovered > maxNewCovered) {
        maxNewCovered = newCovered;
        bestReservation = reservation;
      }
    }

    if (!bestReservation || maxNewCovered === 0) {
      throw new Error('Cannot cover all time slots with available courts');
    }

    // Add the best reservation to our solution
    solution.push(bestReservation);
    
    // Mark its slots as covered
    const slotsForBest = reservationCoverage.find(
      r => r.reservation === bestReservation
    )!.coveredSlots;
    slotsForBest.forEach(slot => coveredSlots.add(slot));
  }

  return solution;
}

// Helper to get all possible court reservations
function getPossibleReservations(
  startTime: Date,
  endTime: Date,
  availableSlots: Omit<HalfHourOpening, 'facility'>[]
): CourtReservation[] {
  // Filter and sort slots within our time range
  const relevantSlots = availableSlots
    .filter(slot => {
      const slotTime = new Date(slot.datetime);
      return slotTime >= startTime && slotTime < endTime;
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  // Group slots by court
  const slotsByCourt = new Map<string, Date[]>();
  relevantSlots.forEach(slot => {
    const slots = slotsByCourt.get(slot.court) || [];
    slots.push(new Date(slot.datetime));
    slotsByCourt.set(slot.court, slots);
  });

  // Find consecutive slots for each court
  const courtReservations: CourtReservation[] = [];
  slotsByCourt.forEach((slots, court) => {
    let currentStart: Date | undefined;
    let lastTime: Date | undefined;

    slots.forEach(time => {
      if (!currentStart) {
        currentStart = time;
        lastTime = time;
        return;
      }

      // If this slot isn't consecutive with the last one
      if (time.getTime() - lastTime!.getTime() !== 30 * 60 * 1000) {
        // Save the previous reservation
        if (currentStart && lastTime) {
          courtReservations.push({
            court,
            startDatetime: currentStart.toISOString(),
            endDatetime: new Date(lastTime.getTime() + 30 * 60 * 1000).toISOString()
          });
        }
        currentStart = time;
      }
      lastTime = time;
    });

    // Don't forget the last reservation
    if (currentStart && lastTime) {
      courtReservations.push({
        court,
        startDatetime: currentStart.toISOString(),
        endDatetime: new Date(lastTime.getTime() + 30 * 60 * 1000).toISOString()
      });
    }
  });

  return courtReservations;
}

export function getOpenings(facility: string, courtTimes: Omit<HalfHourOpening, 'facility'>[]): Opening[] {
  // Convert string datetimes to Date objects and sort them
  const slots = courtTimes
    .map(slot => new Date(slot.datetime))
    .sort((a, b) => a.getTime() - b.getTime());

  // Create all 30-minute openings (used as building blocks)
  const thirtyMinOpenings = slots.map(start => ({
    startDatetime: start.toISOString(),
    endDatetime: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
  }));

  const openings: Opening[] = [];

  // For each valid length
  VALID_LENGTHS.forEach(minuteLength => {
    const previousLength = minuteLength - 30;
    
    // Look through openings of the previous length
    const previousOpenings = previousLength === 30 
      ? thirtyMinOpenings  // Start with 30-min slots
      : openings.filter(o => o.minuteLength === previousLength);
    
    previousOpenings.forEach(prevOpening => {
      const nextSlotStart = new Date(prevOpening.endDatetime);
      
      // Check if there's a 30-min opening that starts right after
      const hasNextSlot = thirtyMinOpenings.some(opening => 
        new Date(opening.startDatetime).getTime() === nextSlotStart.getTime()
      );
      
      if (hasNextSlot) {
        const start = new Date(prevOpening.startDatetime);
        const end = new Date(nextSlotStart.getTime() + 30 * 60 * 1000);
        
        const minimumReservations = findMinimumCourtReservations(
          start,
          end,
          courtTimes
        );

        openings.push({
          facility,
          startDatetime: prevOpening.startDatetime,
          endDatetime: end.toISOString(),
          minuteLength,
          mostConvenient: [minimumReservations.map(r => r.court)]
        });
      }
    });
  });

  return openings.sort((a, b) => 
    new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  );
}

function openingsAreEqual(a: Opening, b: {
  start_datetime: string;
  end_datetime: string;
  minute_length: number;
}): boolean {
  return (
    a.startDatetime === b.start_datetime &&
    a.minuteLength === b.minute_length
  );
}

export async function getNewOpenings(facility: string, openings: Opening[]): Promise<Opening[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<{
      facility: string;
      start_datetime: string;
      end_datetime: string;
      minute_length: number;
    }>(`
      SELECT facility, start_datetime, end_datetime, minute_length
      FROM openings
      WHERE facility = $1
    `, [facility]);

    return openings.filter(opening => 
      !result.rows.some(row => openingsAreEqual(opening, row))
    );
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
          most_convenient
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        facility,
        opening.minuteLength,
        opening.startDatetime,
        opening.endDatetime,
        opening.mostConvenient
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
