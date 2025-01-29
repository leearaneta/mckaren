import { pool } from '../utils/db';
import { Facility } from '../types';

export async function headers(facility: Facility): Promise<void> {
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    const headers = await facility.extractHeaders();
    await client.query(`
      UPDATE facilities 
      SET headers = $2
      WHERE name = $1
    `, [
      facility.config.name,
      JSON.stringify(headers)
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
  