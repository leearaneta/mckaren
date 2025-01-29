import { getAllHalfHourOpenings, replaceOpenings, getNewSubscriptionOpenings } from './openings';
import { pool } from '../utils/db';
import { usta, mccarren, pptc } from '../facilities';
import { Headers, Opening } from '../types';
import { sendOpeningNotifications } from './mail';

export async function getHeaders(facilityName: string): Promise<Headers> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ headers: Headers }>(`
      SELECT headers FROM facilities WHERE name = $1
    `, [facilityName]);
    return result.rows[0]?.headers || [];
  } finally {
    client.release();
  }
}

export async function main() {
  const client = await pool.connect();
  const facilities = [usta, pptc, mccarren];
  const newSubscriptionOpeningsByEmail: Record<string, Opening[]> = {};
  try {
    for (const facility of facilities) {
      const headers = await getHeaders(facility.config.name);
      const halfHourOpenings = await getAllHalfHourOpenings(facility, headers);
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