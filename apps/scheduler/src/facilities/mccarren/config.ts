import { FacilityConfig } from '../../types';

if (!process.env.MCCARREN_EMAIL || !process.env.MCCARREN_PASSWORD || !process.env.MCCARREN_LOGIN_URL || !process.env.MCCARREN_DATA_URL || !process.env.MCCARREN_RESERVATION_URL) {
  throw new Error('Missing MCCARREN configuration in environment variables');
}

export const config: FacilityConfig = {
  name: 'mccarren',
  loginUrl: process.env.MCCARREN_LOGIN_URL,
  dataUrl: process.env.MCCARREN_DATA_URL,
  reservationUrl: process.env.MCCARREN_RESERVATION_URL,
  email: process.env.MCCARREN_EMAIL,
  password: process.env.MCCARREN_PASSWORD,
  maxDaysInAdvance: 4,
  openHour: 6,
  closeHour: 0
};