import { Facility } from '../types';
import { pool } from '../utils/db';

export async function cookies(facility: Facility): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
