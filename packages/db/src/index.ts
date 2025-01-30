import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export type PoolClient = pg.PoolClient;
export type Pool = pg.Pool;

function validateEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing database configuration in environment variables');
  }
}

export function createPool() {
  validateEnv();
  return new pg.Pool({ connectionString: process.env.DATABASE_URL });
}