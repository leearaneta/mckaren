import dotenv from 'dotenv';
import { FacilityConfig } from '../../types';

dotenv.config();

if (!process.env.PPTC_LOGIN_URL || !process.env.PPTC_DATA_URL || !process.env.PPTC_EMAIL || !process.env.PPTC_PASSWORD || !process.env.PPTC_HEADERS_PATH) {
  throw new Error('Missing PPTC configuration in environment variables');
}

export const config: FacilityConfig = {
  name: 'pptc',
  loginUrl: process.env.PPTC_LOGIN_URL || '',
  dataUrl: process.env.PPTC_DATA_URL || '',
  headersPath: process.env.PPTC_HEADERS_PATH || '',
  email: process.env.PPTC_EMAIL || '',
  password: process.env.PPTC_PASSWORD || '',
  maxDaysInAdvance: 7,
  openHour: 6,
  closeHour: 23
};