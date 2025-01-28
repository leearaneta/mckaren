import { getAllHalfHourOpenings, replaceOpenings, getNewSubscriptionOpenings } from './openings';
import { pool } from '../utils/db';
import { usta, mccarren } from '../facilities';
import { Cookies, Opening } from '../types';
import { sendOpeningNotifications } from './mail';

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
  const client = await pool.connect();
  const facilities = [usta, mccarren];
  const newSubscriptionOpeningsByEmail: Record<string, Opening[]> = {};
  try {
    for (const facility of facilities) {
      const cookies = await getCookies(facility.config.name);
      const halfHourOpenings = await getAllHalfHourOpenings(facility, cookies);
      const newSubscriptionOpeningsForFacility = await getNewSubscriptionOpenings(client, facility, halfHourOpenings);
      Object.entries(newSubscriptionOpeningsForFacility).forEach(([email, openings]) => {
        if (!newSubscriptionOpeningsByEmail[email]) {
          newSubscriptionOpeningsByEmail[email] = [];
        }
        newSubscriptionOpeningsByEmail[email].push(...openings);
      });
      await replaceOpenings(client, facility.config.name, halfHourOpenings);
    }
    console.log(newSubscriptionOpeningsByEmail);
    await sendOpeningNotifications(newSubscriptionOpeningsByEmail);
  } finally {
    client.release();
  }
}