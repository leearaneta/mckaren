import { createPool } from '@mckaren/db';
import { useRuntimeConfig } from '#imports';

// Create a pool for the web app
const config = useRuntimeConfig();
process.env.DB_HOST = config.DB_HOST;
process.env.DB_PORT = config.DB_PORT;
process.env.DB_NAME = config.DB_NAME;
process.env.DB_USER = config.DB_USER;
process.env.DB_PASSWORD = config.DB_PASSWORD;

export const pool = createPool(); 