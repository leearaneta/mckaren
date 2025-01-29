import { config } from './config';
import { courtreserveHeaders } from '../../utils/courtreserveHeaders';

export async function extractHeaders() {
  return courtreserveHeaders(config);
}