import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import { Pool } from 'pg';

// Determine which database to use based on environment
const databaseUrl = process.env.DATABASE_URL;

// Use SQLite if DATABASE_URL is not set (local development or build time)
// Use PostgreSQL when DATABASE_URL is set (Railway production)
const useSQLite = !databaseUrl;

let db: ReturnType<typeof drizzleSQLite> | ReturnType<typeof drizzlePostgres>;

if (useSQLite) {
  // SQLite configuration for local development
  console.log('🗄️  Using SQLite database for local development');
  const sqlite = new Database('local.db');
  db = drizzleSQLite(sqlite);
} else {
  // PostgreSQL configuration for production (Railway)
  console.log('🗄️  Using PostgreSQL database');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for production');
  }
  const pool = new Pool({
    connectionString: databaseUrl,
  });
  db = drizzlePostgres(pool);
}

export { db, useSQLite };
