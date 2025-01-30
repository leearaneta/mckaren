import type { HalfHourOpening, Opening, Preferences } from '@mckaren/types';
import type { Client } from '@mckaren/db';

export { HalfHourOpening, Opening };
export { Client };

export type FacilityConfig = {
  name: string;
  loginUrl: string;
  dataUrl: string;
  headersPath?: string;
  reservationUrl?: string;
  email: string;
  password: string;
  maxDaysInAdvance: number;
  openHour?: number;
  closeHour?: number;
}

export type SubscriptionOpening = Opening & { email: string };
export type SubscriptionPreferences = Preferences & { email: string };

export type Headers = Record<string, string>;

export type Facility = {
  config: FacilityConfig;
  extractHeaders: () => Promise<Headers>;
  getHalfHourOpeningsForDate: (date: Date, headers: Headers) => Promise<Omit<HalfHourOpening, 'facility'>[]>;
} 