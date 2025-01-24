import type { Cookie } from 'puppeteer';
import type { HalfHourOpening, Opening, Preferences } from '@mckaren/types';

export { HalfHourOpening, Opening };

export type FacilityConfig = {
  name: string;
  loginUrl: string;
  dataUrl: string;
  reservationUrl?: string;
  email: string;
  password: string;
  maxDaysInAdvance: number;
  openHour?: number;
  closeHour?: number;
}

export type SubscriptionOpening = Opening & { email: string };
export type SubscriptionPreferences = Preferences & { email: string };

export type Cookies = Cookie[];

export type Facility = {
  config: FacilityConfig;
  extractCookies: () => Promise<Cookies>;
  getHalfHourOpeningsForDate: (date: Date, cookies: Cookies) => Promise<Omit<HalfHourOpening, 'facility'>[]>;
} 