import { createPool } from '@mckaren/db';
import { useRuntimeConfig } from '#imports';

// Create a pool for the web app
const config = useRuntimeConfig();
export const pool = createPool({
  host: config.DB_HOST,
  port: parseInt(config.DB_PORT),
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
}); 
