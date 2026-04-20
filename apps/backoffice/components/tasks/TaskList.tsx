'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Task = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  dueDate: string | null
  assignedTo: string | null
  assigneeName: string | null
  createdAt: string
}

type User = { id: string; firstName: string; lastName: string }

type TaskListProps = {
  tasks: Task[]
  users: User[]
  canManage: boolean
}

type Filter = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'

const STATUS_META = {
  TODO: { label: 'À faire', style: { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' } },
  IN_PROGRESS: { label: 'En cours', style: { color: 'var(--color-warning)', backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.20)' } },
  DONE: { label: 'Terminé', style: { color: 'var(--color-success)', backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.20)' } },
}

const FILTER_LABELS: Record<Filter, string> = {
  ALL: 'Toutes',
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminées',
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'DONE') return false
  return task.dueDate < new Date().toISOString().split('T')[0]!
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── Create task modal ────────────────────────────────────────────────────────

function CreateTaskModal({
  users,
  onClose,
  onSuccess,
}: {
  users: User[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          assignedTo: assignedTo || undefined,
          dueDate: dueDate || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Erreur lors de la création')
        return
      }
      onSuccess()
    } catch {
      setError('Erreur réseau, réessayez')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>Nouvelle tâche</h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Nom de la tâche"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Détails optionnels…"
              className="input-base resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Assigner à</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="input-base"
              >
                <option value="">Non assigné</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Échéance</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TaskList({ tasks, users, canManage }: TaskListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filtered = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter)

  const counts: Record<Filter, number> = {
    ALL: tasks.length,
    TODO: tasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
  }

  async function updateStatus(id: string, status: Task['status']) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) router.refresh()
    } finally {
      setUpdatingId(null)
    }
  }

  const STATUS_CYCLE: Record<Task['status'], Task['status']> = {
    TODO: 'IN_PROGRESS',
    IN_PROGRESS: 'DONE',
    DONE: 'TODO',
  }

  return (
    <div>
      {/* Filters + create button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={filter === f
                ? { backgroundColor: 'var(--color-accent)', color: 'var(--color-bg-primary)' }
                : { color: 'var(--color-text-muted)' }
              }
            >
              {FILTER_LABELS[f]}
              <span
                className="ml-1.5 text-xs"
                style={{ color: filter === f ? 'rgba(10,10,11,0.6)' : 'var(--color-text-muted)' }}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-1.5 sm:ml-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvelle tâche
          </button>
        )}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {filter === 'ALL' ? 'Aucune tâche pour le moment.' : `Aucune tâche "${FILTER_LABELS[filter]}".`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const meta = STATUS_META[task.status]
            const overdue = isOverdue(task)
            return (
              <div
                key={task.id}
                className={`card p-4 flex items-start gap-4 ${
                  task.status === 'DONE' ? 'opacity-60' : ''
                }`}
              >
                {/* Status toggle */}
                <button
                  onClick={() => updateStatus(task.id, STATUS_CYCLE[task.status])}
                  disabled={updatingId === task.id}
                  title={`Passer à ${STATUS_META[STATUS_CYCLE[task.status]].label}`}
                  className="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors disabled:opacity-50"
                  style={task.status === 'DONE'
                    ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }
                    : { borderColor: 'var(--color-border)' }
                  }
                  onMouseEnter={(e) => {
                    if (task.status !== 'DONE') (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'
                  }}
                  onMouseLeave={(e) => {
                    if (task.status !== 'DONE') (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                  }}
                >
                  {task.status === 'DONE' && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through' : ''}`}
                      style={{ color: task.status === 'DONE' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
                    >
                      {task.title}
                    </p>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={meta.style}>
                      {meta.label}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{task.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {task.assigneeName && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        {task.assigneeName}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: overdue ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
                        </svg>
                        {overdue ? 'Retard · ' : ''}{fmtDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <CreateTaskModal
          users={users}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
