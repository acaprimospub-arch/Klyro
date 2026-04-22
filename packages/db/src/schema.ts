import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  date,
  boolean,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', [
  'SUPER_ADMIN',
  'DIRECTOR',
  'MANAGER',
  'STAFF',
])

export const taskStatusEnum = pgEnum('task_status', [
  'TODO',
  'IN_PROGRESS',
  'DONE',
])

export const leaveStatusEnum = pgEnum('leave_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
])

export const reservationStatusEnum = pgEnum('reservation_status', [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const establishments = pgTable('establishments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  contactEmail: text('contact_email'),
  type: text('type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  establishmentId: uuid('establishment_id')
    .notNull()
    .references(() => establishments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // SUPER_ADMIN has null establishmentId — every other role must have one
  establishmentId: uuid('establishment_id').references(() => establishments.id, {
    onDelete: 'cascade',
  }),
  positionId: uuid('position_id').references(() => positions.id, {
    onDelete: 'set null',
  }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  // 4-digit PIN hashed with bcrypt — used for time-clock only
  pin: text('pin'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  establishmentId: uuid('establishment_id')
    .notNull()
    .references(() => establishments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  position: text('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  establishmentId: uuid('establishment_id')
    .notNull()
    .references(() => establishments.id, { onDelete: 'cascade' }),
  assignedTo: uuid('assigned_to').references(() => users.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('TODO'),
  dueDate: date('due_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  establishmentId: uuid('establishment_id')
    .notNull()
    .references(() => establishments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: text('reason'),
  status: leaveStatusEnum('status').notNull().default('PENDING'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  establishmentId: uuid('establishment_id')
    .notNull()
    .references(() => establishments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  clockIn: timestamp('clock_in', { withTimezone: true }).notNull(),
  clockOut: timestamp('clock_out', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const taskCategories = pgTable('task_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  establishmentId: uuid('establishment_id')
    .notNull()
    .references(() => establishments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const managerPermissions = pgTable('manager_permissions', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  userId:                   uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  establishmentId:          uuid('establishment_id').notNull().references(() => establishments.id, { onDelete: 'cascade' }),
  canEditPlanning:          boolean('can_edit_planning').notNull().default(true),
  canEditTasks:             boolean('can_edit_tasks').notNull().default(true),
  canEditStaff:             boolean('can_edit_staff').notNull().default(false),
  canEditReservations:      boolean('can_edit_reservations').notNull().default(true),
  canEditLeaves:            boolean('can_edit_leaves').notNull().default(true),
  canViewTimeclock:         boolean('can_view_timeclock').notNull().default(true),
  canApproveLeavesRequests: boolean('can_approve_leave_requests').notNull().default(true),
  createdAt:                timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  establishmentId: uuid('establishment_id')
    .notNull()
    .references(() => establishments.id, { onDelete: 'cascade' }),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),
  partySize: integer('party_size').notNull(),
  reservedAt: timestamp('reserved_at', { withTimezone: true }).notNull(),
  status: reservationStatusEnum('status').notNull().default('PENDING'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const establishmentRelations = relations(establishments, ({ many }) => ({
  users: many(users),
  positions: many(positions),
  schedules: many(schedules),
  tasks: many(tasks),
  leaveRequests: many(leaveRequests),
  timeEntries: many(timeEntries),
  reservations: many(reservations),
  taskCategories: many(taskCategories),
}))

export const positionRelations = relations(positions, ({ one, many }) => ({
  establishment: one(establishments, {
    fields: [positions.establishmentId],
    references: [establishments.id],
  }),
  users: many(users),
}))

export const userRelations = relations(users, ({ one, many }) => ({
  establishment: one(establishments, {
    fields: [users.establishmentId],
    references: [establishments.id],
  }),
  position: one(positions, {
    fields: [users.positionId],
    references: [positions.id],
  }),
  schedules: many(schedules),
  tasks: many(tasks),
  leaveRequests: many(leaveRequests),
  timeEntries: many(timeEntries),
}))

export const scheduleRelations = relations(schedules, ({ one }) => ({
  establishment: one(establishments, {
    fields: [schedules.establishmentId],
    references: [establishments.id],
  }),
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
}))

export const taskRelations = relations(tasks, ({ one }) => ({
  establishment: one(establishments, {
    fields: [tasks.establishmentId],
    references: [establishments.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
}))

export const leaveRequestRelations = relations(leaveRequests, ({ one }) => ({
  establishment: one(establishments, {
    fields: [leaveRequests.establishmentId],
    references: [establishments.id],
  }),
  user: one(users, {
    fields: [leaveRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [leaveRequests.reviewedBy],
    references: [users.id],
  }),
}))

export const timeEntryRelations = relations(timeEntries, ({ one }) => ({
  establishment: one(establishments, {
    fields: [timeEntries.establishmentId],
    references: [establishments.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
}))

export const reservationRelations = relations(reservations, ({ one }) => ({
  establishment: one(establishments, {
    fields: [reservations.establishmentId],
    references: [establishments.id],
  }),
}))

export const taskCategoryRelations = relations(taskCategories, ({ one }) => ({
  establishment: one(establishments, {
    fields: [taskCategories.establishmentId],
    references: [establishments.id],
  }),
}))

export const managerPermissionsRelations = relations(managerPermissions, ({ one }) => ({
  user: one(users, {
    fields: [managerPermissions.userId],
    references: [users.id],
  }),
  establishment: one(establishments, {
    fields: [managerPermissions.establishmentId],
    references: [establishments.id],
  }),
}))

// ─── Type exports ─────────────────────────────────────────────────────────────

export type Establishment = typeof establishments.$inferSelect
export type NewEstablishment = typeof establishments.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Schedule = typeof schedules.$inferSelect
export type NewSchedule = typeof schedules.$inferInsert

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

export type LeaveRequest = typeof leaveRequests.$inferSelect
export type NewLeaveRequest = typeof leaveRequests.$inferInsert

export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert

export type Reservation = typeof reservations.$inferSelect
export type NewReservation = typeof reservations.$inferInsert

export type Position = typeof positions.$inferSelect
export type NewPosition = typeof positions.$inferInsert

export type ManagerPermissions = typeof managerPermissions.$inferSelect
export type NewManagerPermissions = typeof managerPermissions.$inferInsert

export type TaskCategory = typeof taskCategories.$inferSelect
export type NewTaskCategory = typeof taskCategories.$inferInsert

export type Role = (typeof roleEnum.enumValues)[number]
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number]
export type LeaveStatus = (typeof leaveStatusEnum.enumValues)[number]
export type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number]
