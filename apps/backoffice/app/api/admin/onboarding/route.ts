import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db, establishments, users, positions, taskCategories } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'

const schema = z.object({
  establishment: z.object({
    name:          z.string().min(1),
    address:       z.string().min(1),
    phone:         z.string().optional(),
    contactEmail:  z.string().email().optional(),
    type:          z.string().optional(),
  }),
  director: z.object({
    firstName: z.string().min(1),
    lastName:  z.string().min(1),
    email:     z.string().email(),
    password:  z.string().min(6),
  }),
  templates: z.object({
    positions:      z.array(z.string()),
    taskCategories: z.array(z.string()),
  }),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const { establishment: estData, director: dirData, templates } = parsed.data

  const passwordHash = await bcrypt.hash(dirData.password, 12)

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Create establishment
      const [estab] = await tx
        .insert(establishments)
        .values({
          name:         estData.name,
          address:      estData.address,
          phone:        estData.phone         ?? null,
          contactEmail: estData.contactEmail  ?? null,
          type:         estData.type          ?? null,
        })
        .returning()

      if (!estab) throw new Error('Failed to create establishment')

      // 2. Create director user
      const [director] = await tx
        .insert(users)
        .values({
          establishmentId: estab.id,
          firstName:    dirData.firstName,
          lastName:     dirData.lastName,
          email:        dirData.email,
          passwordHash,
          role:         'DIRECTOR',
        })
        .returning()

      if (!director) throw new Error('Failed to create director')

      // 3. Create position templates
      if (templates.positions.length > 0) {
        await tx.insert(positions).values(
          templates.positions.map((name) => ({ establishmentId: estab.id, name }))
        )
      }

      // 4. Create task category templates
      if (templates.taskCategories.length > 0) {
        await tx.insert(taskCategories).values(
          templates.taskCategories.map((name) => ({ establishmentId: estab.id, name }))
        )
      }

      return {
        establishment: {
          id:      estab.id,
          name:    estab.name,
          address: estab.address,
        },
        director: {
          id:        director.id,
          firstName: director.firstName,
          lastName:  director.lastName,
          email:     director.email,
        },
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}
