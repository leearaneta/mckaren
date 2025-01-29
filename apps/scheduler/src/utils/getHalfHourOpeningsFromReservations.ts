import { HalfHourOpening } from "../types";

export function getHalfHourOpeningsFromReservations(
  reservations: { start: Date, end: Date, court: string }[],
  courtNames: string[],
  date: Date,
  openHour: number,
  _closeHour: number
): Omit<HalfHourOpening, 'facility'>[] {

  const openings: Omit<HalfHourOpening, 'facility'>[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(openHour || 6, 0, 0, 0); // Default to 6 AM if not specified
  
  const endOfDay = new Date(date);
  const closeHour = _closeHour ?? 23; // Default to 11 PM if not specified
  // If closeHour is 0 (midnight), set it to midnight of the next day
  if (closeHour === 0) {
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);
  } else {
    endOfDay.setHours(closeHour, 0, 0, 0);
  }

  // For each court, find available 30-minute slots
  for (const court of courtNames) {
    let currentTime = new Date(startOfDay);
    const courtReservations = reservations.filter(r => r.court === court);
    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000);
      // Check if this time slot overlaps with any reservation
      const isReserved = courtReservations.find(reservation => 
        !(slotEnd <= reservation.start || currentTime >= reservation.end)
      );
      if (!isReserved) {
        openings.push({
          court,
          datetime: currentTime
        });
      }
      currentTime = slotEnd;
    }
  }

  return openings;
}