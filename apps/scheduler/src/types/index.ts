import type { Protocol } from 'puppeteer';
import type { HalfHourOpening, Opening } from '@mckaren/types';

export { HalfHourOpening, Opening };

export interface FacilityConfig {
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

export type Cookies = Protocol.Network.Cookie[];

export interface Facility {
  config: FacilityConfig;
  extractCookies: () => Promise<Cookies>;
  getHalfHourOpeningsForDate: (date: Date, cookies: Cookies) => Promise<Omit<HalfHourOpening, 'facility'>[]>;
} 