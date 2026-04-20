import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { establishments, users } from './schema'

const BCRYPT_ROUNDS = 12

async function main() {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL is required')

  const client = postgres(url, { max: 1 })
  const db = drizzle(client)

  console.log('🌱 Seeding database…')

  // ── Establishment ──────────────────────────────────────────────────────────
  const [establishment] = await db
    .insert(establishments)
    .values({ name: 'Klyro Demo', address: '12 rue de la Paix, 75001 Paris' })
    .onConflictDoNothing()
    .returning()

  if (!establishment) {
    console.log('⚠️  Establishment already exists, skipping.')
    await client.end()
    return
  }

  console.log(`✓ Establishment: ${establishment.name} (${establishment.id})`)

  // ── Users ──────────────────────────────────────────────────────────────────
  const seedUsers = [
    {
      email: 'admin@klyro.fr',
      password: 'admin1234',
      firstName: 'Admin',
      lastName: 'Klyro',
      role: 'SUPER_ADMIN' as const,
      establishmentId: null, // SUPER_ADMIN has no establishment
    },
    {
      email: 'manager@klyro.fr',
      password: 'manager1234',
      firstName: 'Marie',
      lastName: 'Dupont',
      role: 'MANAGER' as const,
      establishmentId: establishment.id,
    },
    {
      email: 'staff@klyro.fr',
      password: 'staff1234',
      firstName: 'Lucas',
      lastName: 'Martin',
      role: 'STAFF' as const,
      establishmentId: establishment.id,
    },
  ]

  for (const u of seedUsers) {
    const { password, ...userData } = u
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const [inserted] = await db
      .insert(users)
      .values({ ...userData, passwordHash })
      .onConflictDoNothing()
      .returning({ id: users.id, email: users.email, role: users.role })

    if (inserted) {
      console.log(`✓ User [${inserted.role}]: ${inserted.email}`)
    } else {
      console.log(`⚠️  User already exists: ${u.email}`)
    }
  }

  console.log('\n✅ Seed complete.')
  console.log('   admin@klyro.fr    / admin1234')
  console.log('   manager@klyro.fr  / manager1234')
  console.log('   staff@klyro.fr    / staff1234')

  await client.end()
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
