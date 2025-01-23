import { getAllHalfHourOpenings, getOpenings, getNewOpenings, replaceOpenings } from './openings';
import { pool } from '../utils/db';
import { usta, mccarren } from '../facilities';
import { Cookies } from '../types';

export async function getCookies(facilityName: string): Promise<Cookies> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ cookies: Cookies }>(`
      SELECT cookies FROM facilities WHERE name = $1
    `, [facilityName]);
    return result.rows[0]?.cookies || [];
  } finally {
    client.release();
  }
}

export async function main() {
  const facilities = [usta, mccarren];
  for (const facility of facilities) {
    const cookies = await getCookies(facility.config.name);
    const halfHourOpenings = await getAllHalfHourOpenings(facility, cookies);
    const openings = getOpenings(facility.config.name, halfHourOpenings);
    console.log('openings', openings);
    const newOpenings = await getNewOpenings(facility.config.name, openings);
    console.log('newOpenings', newOpenings);
    await replaceOpenings(facility.config.name, openings, halfHourOpenings);
  }
}