import { pool } from '../utils/db'

export default defineEventHandler(async (event) => {
  const { email } = getQuery(event)

  if (!email || typeof email !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Email is required'
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Delete all subscriptions and preferences for this email
    await client.query(
      `DELETE FROM facility_court_preferences WHERE email = $1`,
      [email]
    )
    await client.query(
      `DELETE FROM facility_subscriptions WHERE email = $1`,
      [email]
    )

    await client.query('COMMIT')

    // Return HTML page
    event.node.res.setHeader('Content-Type', 'text/html')
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.5;
              max-width: 36rem;
              margin: 0 auto;
              padding: 2rem 1rem;
              text-align: center;
            }
            h1 { color: #374151; margin-bottom: 1rem; }
            p { color: #6B7280; margin-bottom: 2rem; }
            a {
              color: #2563EB;
              text-decoration: none;
            }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Successfully Unsubscribed</h1>
          <p>You will no longer receive court opening notifications.</p>
          <a href="/">return to mckaren</a>
        </body>
      </html>
    `
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error unsubscribing:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to unsubscribe'
    })
  } finally {
    client.release()
  }
}) 