import { config } from './config';
import { HalfHourOpening, Cookies } from '../../types';

interface ApiResponse {
  Data: Array<{
    Start: string;
    AvailableCourtIds: number[];
  }>;
}

export async function getHalfHourOpeningsForDate(date: Date, cookies: Cookies): Promise<Omit<HalfHourOpening, 'facility'>[]> {
  const payload = {
    orgId: "5881",
    TimeZone: "America/New_York",
    KendoDate: {
      Year: date.getFullYear(),
      Month: date.getMonth() + 1, // JavaScript months are 0-based
      Day: date.getDate()
    },
    UiCulture: "en-US",
    CostTypeId: "78549",
    CustomSchedulerId: "294",
    ReservationMinInterval: "60"
  };

  const formData = new URLSearchParams({
    sort: '',
    group: '',
    filter: '',
    jsonData: JSON.stringify(payload)
  });

  const response = await fetch(config.dataUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies.map(c => `${c.name}=${c.value}`).join('; ')
    },
    body: formData.toString()
  });

  if (!response.ok) {
    throw new Error(`Failed to get reservation data: ${response.statusText}`);
  }

  const data = await response.json() as ApiResponse;
  
  const slots: Omit<HalfHourOpening, 'facility'>[] = [];
  
  for (const slot of data.Data) {
    if (slot.AvailableCourtIds.length > 0) {
      // Convert /Date(1234567890000)/ to ISO string
      const timestamp = parseInt(slot.Start.replace('/Date(', '').replace(')/', ''));
      const datetime = new Date(timestamp);
      
      // Create a slot for each available court
      for (const courtId of slot.AvailableCourtIds) {
        slots.push({
          court: `${courtId}`,
          datetime,
        });
      }
    }
  }
  
  return slots;
} 