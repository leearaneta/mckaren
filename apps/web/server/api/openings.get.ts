import { pool } from '../utils/db'
import { convertKeysToCamelCase } from '~/utils/case-conversion'

export default defineEventHandler(async (event) => {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        facility,
        start_datetime,
        end_datetime,
        minute_length
      FROM openings
      ORDER BY facility, start_datetime
    `)
    return convertKeysToCamelCase(result.rows)
  } finally {
    client.release()
  }
}) 