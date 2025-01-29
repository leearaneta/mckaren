import { createPool, type Pool } from '@mckaren/db';

// Create a pool for the scheduler app
export const pool: Pool = createPool();