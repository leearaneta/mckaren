import { pool } from '../utils/db';
import { usta, mccarren } from '../facilities';
import { Facility } from '../types';

export async function cookies(): Promise<void> {
  const client = await pool.connect();
  const facilities: Facility[] = [usta, mccarren];
  await client.query('BEGIN');
  try {
    for (const facility of facilities) {
      const cookies = await facility.extractCookies();
      await client.query(`
        UPDATE facilities 
        SET cookies = $2
        WHERE name = $1
      `, [
        facility.config.name,
        JSON.stringify(cookies)
      ]);
      await client.query('COMMIT');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
  