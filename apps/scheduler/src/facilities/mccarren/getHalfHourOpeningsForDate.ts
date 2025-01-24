import { config } from './config';
import { HalfHourOpening, Cookies } from '../../types';


interface CourtReserveResponse {
  Data: Array<{
    CourtLabel: string;
    Start: string;
    End: string;
  }>;
}

const COURT_IDS = [
  '34737',
  '34738',
  '34739',
  '34740',
  '34788',
  '34789',
  '34790'
];

export async function getHalfHourOpeningsForDate(date: Date, cookies?: Cookies): Promise<Omit<HalfHourOpening, 'facility'>[]> {
  // Format date for the request
  const kendoDate = {
    Year: date.getFullYear(),
    Month: date.getMonth() + 1,
    Day: date.getDate()
  };

  // Create the request JSON data
  const jsonData = {
    startDate: date.toISOString(),
    orgId: '10243',
    TimeZone: 'America/New_York',
    Date: date.toUTCString(),
    KendoDate: kendoDate,
    UiCulture: 'en-US',
    CostTypeId: '104772',
    CustomSchedulerId: '',
    ReservationMinInterval: '60',
    SelectedCourtIds: COURT_IDS.join(','),
    SelectedInstructorIds: '',
    MemberIds: '816024',
    MemberFamilyId: '984690',
    EmbedCodeId: '',
    HideEmbedCodeReservationDetails: 'True'
  };
  
  // Construct the new URL
  const newUrl = `${config.dataUrl}&jsonData=${encodeURIComponent(JSON.stringify(jsonData))}`;

  // Make the request
  const response = await fetch(newUrl, {
    headers: {
      Cookie: cookies?.map(c => `${c.name}=${c.value}`).join('; ') || ''
    }
  });
  const data = await response.json() as CourtReserveResponse;

  // Get all court reservations
  const reservations = data.Data.map(reservation => ({
    court: reservation.CourtLabel as string,
    start: new Date(reservation.Start),
    end: new Date(reservation.End)
  }));

  // Generate all possible 30-minute slots for the day
  const openings: Omit<HalfHourOpening, 'facility'>[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(config.openHour || 6, 0, 0, 0); // Default to 6 AM if not specified
  
  const endOfDay = new Date(date);
  const closeHour = config.closeHour ?? 23; // Default to 11 PM if not specified
  // If closeHour is 0 (midnight), set it to midnight of the next day
  if (closeHour === 0) {
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);
  } else {
    endOfDay.setHours(closeHour, 0, 0, 0);
  }

  // Get unique courts from reservations
  const courts = [...new Set(reservations.map(r => r.court))];

  // For each court, find available 30-minute slots
  for (const court of courts) {
    let currentTime = new Date(startOfDay);
    const courtReservations = reservations.filter(r => r.court === court);

    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000);
      
      // Check if this time slot overlaps with any reservation
      const isReserved = courtReservations.some(reservation => 
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
