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
  if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_NAME || 
      !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error('Missing database configuration in environment variables');
  }
}

export function createPool() {
  validateEnv();

  return new pg.Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
}