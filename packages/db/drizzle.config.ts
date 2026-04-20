import { defineConfig } from 'drizzle-kit'

// DATABASE_URL is only needed for push/pull/studio — not for generate
const dbUrl = process.env['DATABASE_URL'] ?? 'postgresql://localhost/klyro'

export default defineConfig({
  schema: './src/schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true,
})
