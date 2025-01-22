import dotenv from 'dotenv';
import { FacilityConfig } from '../../types';

dotenv.config();

if (!process.env.USTA_LOGIN_URL || !process.env.USTA_DATA_URL || !process.env.USTA_EMAIL || !process.env.USTA_PASSWORD) {
  throw new Error('Missing USTA configuration in environment variables');
}

export const config: FacilityConfig = {
  name: 'usta',
  loginUrl: process.env.USTA_LOGIN_URL,
  dataUrl: process.env.USTA_DATA_URL,
  email: process.env.USTA_EMAIL,
  password: process.env.USTA_PASSWORD,
  maxDaysInAdvance: 2,
};