export interface HalfHourOpening {
  facility: string;
  court: string;
  datetime: string;
}

export interface Opening {
  facility: string;
  startDatetime: string;
  endDatetime: string;
  minuteLength: 60 | 90 | 120 | 150 | 180;
  mostConvenient: string[][];
}

export interface CourtReservation {
  court: string;
  startDatetime: string;
  endDatetime: string;
} 