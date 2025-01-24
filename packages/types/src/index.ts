export interface HalfHourOpening {
  facility: string;
  court: string;
  datetime: Date;
}

export type DurationMinutes = 30 | 60 | 90 | 120 | 150 | 180;

export type Opening = {
  facility: string;
  startDatetime: Date;
  endDatetime: Date;
  durationMinutes: DurationMinutes;
  path: string[];
}

export type CourtReservation = {
  court: string;
  startDatetime: Date;
  endDatetime: Date;
}

export type Time = {
  hour: number;
  minute: 0 | 30;
}

export type Preferences = {
  minStartTime: Time;
  maxEndTime: Time;
  minDuration: DurationMinutes;
  daysOfWeek: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
  omittedCourts: string[];
}