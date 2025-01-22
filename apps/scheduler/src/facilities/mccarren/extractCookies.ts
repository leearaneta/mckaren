import { config } from './config';
import { courtreserveCookies } from '../../utils/courtreserveCookies';

export async function extractCookies() {
  return courtreserveCookies(config);
}