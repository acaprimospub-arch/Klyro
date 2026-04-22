import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
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
    .values({ name: 'Staffizi Demo', address: '12 rue de la Paix, 75001 Paris' })
    .onConflictDoNothing()
    .returning()

  // If already existed, fetch it
  const eid = establishment?.id ?? (
    await db
      .select({ id: establishments.id })
      .from(establishments)
      .limit(1)
      .then((r) => r[0]?.id)
  )

  if (!eid) throw new Error('Could not find or create establishment')
  console.log(`✓ Establishment: ${eid}`)

  // ── Users ──────────────────────────────────────────────────────────────────
  const seedUsers = [
    {
      email: 'admin@staffizi.fr',
      password: 'admin1234',
      pin: '0000',
      firstName: 'Admin',
      lastName: 'Staffizi',
      role: 'SUPER_ADMIN' as const,
      establishmentId: null,
    },
    {
      email: 'manager@staffizi.fr',
      password: 'manager1234',
      pin: '1111',
      firstName: 'Marie',
      lastName: 'Dupont',
      role: 'MANAGER' as const,
      establishmentId: eid,
    },
    {
      email: 'staff@staffizi.fr',
      password: 'staff1234',
      pin: '2222',
      firstName: 'Lucas',
      lastName: 'Martin',
      role: 'STAFF' as const,
      establishmentId: eid,
    },
  ]

  for (const u of seedUsers) {
    const { password, pin, ...userData } = u
    const [passwordHash, pinHash] = await Promise.all([
      bcrypt.hash(password, BCRYPT_ROUNDS),
      bcrypt.hash(pin, BCRYPT_ROUNDS),
    ])

    const [upserted] = await db
      .insert(users)
      .values({ ...userData, passwordHash, pin: pinHash })
      .onConflictDoUpdate({
        target: users.email,
        set: { pin: pinHash, passwordHash },
      })
      .returning({ id: users.id, email: users.email, role: users.role })

    console.log(`✓ User [${upserted!.role}]: ${upserted!.email} — PIN ${pin}`)
  }

  console.log('\n✅ Seed complete.')
  console.log('   admin@staffizi.fr    / admin1234  — PIN 0000')
  console.log('   manager@staffizi.fr  / manager1234 — PIN 1111')
  console.log('   staff@staffizi.fr    / staff1234   — PIN 2222')

  await client.end()
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
