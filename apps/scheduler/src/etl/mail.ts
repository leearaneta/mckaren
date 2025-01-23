import type { HalfHourOpening } from '../types'

interface CourtReservation {
  court: string;
  startDatetime: Date;
  endDatetime: Date;
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
      const slotTime = slot.datetime;
      return slotTime >= startTime && slotTime < endTime;
    })
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  // Group slots by court
  const slotsByCourt = new Map<string, Date[]>();
  relevantSlots.forEach(slot => {
    const slots = slotsByCourt.get(slot.court) || [];
    slots.push(slot.datetime);
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
            startDatetime: currentStart,
            endDatetime: new Date(lastTime.getTime() + 30 * 60 * 1000)
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
        startDatetime: currentStart,
        endDatetime: new Date(lastTime.getTime() + 30 * 60 * 1000)
      });
    }
  });

  return courtReservations;
}