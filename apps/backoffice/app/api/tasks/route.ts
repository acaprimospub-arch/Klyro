import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, tasks, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      dueDate: tasks.dueDate,
      assignedTo: tasks.assignedTo,
      createdAt: tasks.createdAt,
      assigneeFirstName: users.firstName,
      assigneeLastName: users.lastName,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(eq(tasks.establishmentId, eid))
    .orderBy(tasks.createdAt)

  return NextResponse.json({
    tasks: result.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      assigneeName:
        t.assigneeFirstName && t.assigneeLastName
          ? `${t.assigneeFirstName} ${t.assigneeLastName}`
          : null,
    })),
  })
}

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { title, description, assignedTo, dueDate } = parsed.data

  // Verify assignee belongs to this establishment
  if (assignedTo) {
    const [assignee] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assignedTo), eq(users.establishmentId, eid)))
      .limit(1)

    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found in this establishment' }, { status: 404 })
    }
  }

  const [task] = await db
    .insert(tasks)
    .values({
      establishmentId: eid,
      title,
      description: description ?? null,
      assignedTo: assignedTo ?? null,
      dueDate: dueDate ?? null,
      status: 'TODO',
    })
    .returning()

  return NextResponse.json({ task }, { status: 201 })
}
