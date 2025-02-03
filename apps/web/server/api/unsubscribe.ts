import { pool } from '../utils/db'

export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required'
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Delete all court preferences
    await client.query(
      `DELETE FROM facility_court_preferences WHERE email = $1`,
      [email]
    )

    // Delete subscriptions - facility_subscriptions will be deleted automatically via cascade
    await client.query(
      `DELETE FROM subscriptions WHERE email = $1`,
      [email]
    )

    await client.query('COMMIT')
    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}) 