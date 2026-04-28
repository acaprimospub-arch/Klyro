import { redirect } from 'next/navigation'
import { and, asc, eq, ne } from 'drizzle-orm'
import { db, tasks, users, taskCategories } from '@klyro/db'
import { getSession } from '@/lib/auth'
import { getEffectiveEstablishmentId } from '@/lib/establishment'
import { hasMinRole } from '@/lib/rbac'
import { TaskList } from '@/components/tasks/TaskList'

export default async function TasksPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const eid = await getEffectiveEstablishmentId(session)

  if (!eid) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Aucun établissement disponible.
      </div>
    )
  }

  const [allTasks, allUsers, allCategories] = await Promise.all([
    db
      .select({
        id:            tasks.id,
        title:         tasks.title,
        description:   tasks.description,
        status:        tasks.status,
        dueDate:       tasks.dueDate,
        assignedTo:    tasks.assignedTo,
        categoryId:    tasks.categoryId,
        createdAt:     tasks.createdAt,
        assigneeFirstName: users.firstName,
        assigneeLastName:  users.lastName,
        categoryName:  taskCategories.name,
        categoryColor: taskCategories.color,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .leftJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
      .where(eq(tasks.establishmentId, eid))
      .orderBy(tasks.createdAt),

    db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(and(eq(users.establishmentId, eid), ne(users.role, 'SUPER_ADMIN')))
      .orderBy(users.firstName),

    db
      .select({ id: taskCategories.id, name: taskCategories.name, color: taskCategories.color })
      .from(taskCategories)
      .where(eq(taskCategories.establishmentId, eid))
      .orderBy(asc(taskCategories.name)),
  ])

  const serializedTasks = allTasks.map((t) => ({
    id:            t.id,
    title:         t.title,
    description:   t.description,
    status:        t.status,
    dueDate:       t.dueDate,
    assignedTo:    t.assignedTo,
    categoryId:    t.categoryId,
    categoryName:  t.categoryName,
    categoryColor: t.categoryColor,
    createdAt:     t.createdAt.toISOString(),
    assigneeName:  t.assigneeFirstName && t.assigneeLastName
      ? `${t.assigneeFirstName} ${t.assigneeLastName}`
      : null,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>Tâches</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Suivi des tâches de l'équipe</p>
      </div>

      <TaskList
        tasks={serializedTasks}
        users={allUsers}
        categories={allCategories}
        canManage={hasMinRole(session, 'MANAGER')}
        currentUserId={session.sub}
      />
    </div>
  )
}
