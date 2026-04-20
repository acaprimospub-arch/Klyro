import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

const g = globalThis as unknown as { _klyroDb?: DrizzleDB }

function createDb(): DrizzleDB {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL environment variable is required')
  const client = postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10 })
  return drizzle(client, { schema })
}

// Reuse across Next.js HMR reloads in development
export const db: DrizzleDB = g._klyroDb ?? (g._klyroDb = createDb())
export type Database = typeof db
