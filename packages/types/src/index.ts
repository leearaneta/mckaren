export interface HalfHourOpening {
  facility: string;
  court: string;
  datetime: Date;
}

export interface Opening {
  facility: string;
  startDatetime: Date;
  endDatetime: Date;
  minuteLength: 60 | 90 | 120 | 150 | 180;
  mostConvenient: string[][];
}

export interface CourtReservation {
  court: string;
  startDatetime: Date;
  endDatetime: Date;
} 