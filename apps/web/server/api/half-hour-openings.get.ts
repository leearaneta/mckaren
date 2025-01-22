import { pool } from '../utils/db'
import { convertKeysToCamelCase } from '~/utils/case-conversion'

export default defineEventHandler(async (event) => {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        facility,
        court,
        datetime
      FROM half_hour_openings
      ORDER BY facility, court, datetime
    `)
    
    return convertKeysToCamelCase(result.rows)
  } finally {
    client.release()
  }
}) 