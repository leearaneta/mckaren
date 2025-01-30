import { config } from './config';
import { HalfHourOpening, Headers } from '~/types';
import { getHalfHourOpeningsFromReservations } from '~/utils/getHalfHourOpeningsFromReservations';


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

export async function getHalfHourOpeningsForDate(date: Date, headers?: Headers): Promise<Omit<HalfHourOpening, 'facility'>[]> {
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
  const response = await fetch(newUrl, { headers });
  const data = await response.json() as CourtReserveResponse;

  // Get all court reservations
  const reservations = data.Data.map(reservation => ({
    court: reservation.CourtLabel as string,
    start: new Date(reservation.Start),
    end: new Date(reservation.End)
  }));

  // Get unique courts from reservations
  const courts = [
    "Court #1 (Singles Court)",
    "Court #2",
    "Court #3",
    "Court #4",
    "Court #5",
    "Court #6",
    "Court #7"
  ];

  return getHalfHourOpeningsFromReservations(
    reservations,
    courts,
    date,
    config.openHour!,
    config.closeHour!
  );

}
