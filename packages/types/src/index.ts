export type Time = {
  hour: number;
  minute: number;
};

export type DurationMinutes = 30 | 60 | 90 | 120 | 150 | 180;

export type Preferences = {
  minStartTime: Time;
  maxEndTime: Time;
  minDuration: DurationMinutes;
  daysOfWeek: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
  omittedCourts: string[];
};

export type HalfHourOpening = {
  facility: string;
  court: string;
  datetime: Date;
};

export type Opening = {
  facility: string;
  startDatetime: Date;
  endDatetime: Date;
  durationMinutes: DurationMinutes;
  path: string[];
};

export type CourtReservation = {
  court: string;
  startDatetime: Date;
  endDatetime: Date;
}

export type FacilityCourtPreferences = {
  email: string;
  facility: string;
  omittedCourts: string[];
};

export type FacilitySubscription = {
  id: number;
  email: string;
  facility: string;
  name: string;
  preferences: Preferences;
};