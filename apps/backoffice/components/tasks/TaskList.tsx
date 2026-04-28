'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toastSuccess, toastError, apiErrorMessage } from '@/lib/toast'

type Task = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  dueDate: string | null
  assignedTo: string | null
  assigneeName: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  createdAt: string
}

type User = { id: string; firstName: string; lastName: string }
type Category = { id: string; name: string; color: string }

type TaskListProps = {
  tasks: Task[]
  users: User[]
  categories: Category[]
  canManage: boolean
  currentUserId: string
}

type Filter = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'

type DrawerState = { open: boolean; task: Task | null }

const STATUS_META = {
  TODO:        { label: 'À faire',  style: { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' } },
  IN_PROGRESS: { label: 'En cours', style: { color: 'var(--color-warning)', backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.20)' } },
  DONE:        { label: 'Terminé',  style: { color: 'var(--color-success)', backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.20)' } },
}

const STATUS_CYCLE: Record<Task['status'], Task['status']> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'TODO',
}

const FILTER_LABELS: Record<Filter, string> = {
  ALL: 'Toutes', TODO: 'À faire', IN_PROGRESS: 'En cours', DONE: 'Terminées',
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'DONE') return false
  return task.dueDate < new Date().toISOString().split('T')[0]!
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── Color swatch picker ──────────────────────────────────────────────────────

const COLOR_PALETTE = [
  '#94A3B8', '#E07547', '#60A5FA', '#34D399',
  '#FBBF24', '#F87171', '#A78BFA', '#FB923C',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full transition-all"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : 'none',
            outlineOffset: '2px',
            transform: value === c ? 'scale(1.15)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}

// ─── Task Drawer ──────────────────────────────────────────────────────────────

function TaskDrawer({
  drawer, users, categories, canManage, onClose, onSuccess,
}: {
  drawer: DrawerState
  users: User[]
  categories: Category[]
  canManage: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const task = drawer.task
  const [title,       setTitle]       = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [assignedTo,  setAssignedTo]  = useState(task?.assignedTo ?? '')
  const [dueDate,     setDueDate]     = useState(task?.dueDate ?? '')
  const [categoryId,  setCategoryId]  = useState(task?.categoryId ?? '')
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (task) {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: description || null,
            assignedTo:  assignedTo  || null,
            dueDate:     dueDate     || null,
            categoryId:  categoryId  || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          toastError(apiErrorMessage(res.status, data.error)); return
        }
        toastSuccess('Tâche modifiée')
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: description || undefined,
            assignedTo:  assignedTo  || undefined,
            dueDate:     dueDate     || undefined,
            categoryId:  categoryId  || undefined,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          toastError(apiErrorMessage(res.status, data.error)); return
        }
        toastSuccess('Tâche créée')
      }
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        toastError(apiErrorMessage(res.status, data.error)); return
      }
      toastSuccess('Tâche supprimée')
      onSuccess()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {drawer.open && (
        <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      )}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out
          bottom-0 left-0 right-0 rounded-t-2xl
          sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:rounded-2xl sm:w-full sm:max-w-md
          ${drawer.open ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-0 opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:pt-5">
          <h2 className="text-base font-semibold font-display" style={{ color: 'var(--color-text-primary)' }}>
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button type="button" onClick={onClose} className="p-3 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="task-drawer-form" onSubmit={handleSave} className="px-5 pb-2 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Titre *</label>
            <input type="text" required className="input-base" placeholder="Nom de la tâche"
              value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
            <textarea rows={2} className="input-base resize-none" placeholder="Détails optionnels…"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Category + Assign row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Catégorie</label>
              <select className="input-base" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— Aucune —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Assigner à</label>
              <select className="input-base" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Non assigné</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Échéance</label>
            <input type="date" className="input-base" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </form>

        <div className="flex items-center gap-2 px-5 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {task && canManage && (
            <button type="button" onClick={handleDelete} disabled={deleting || saving}
              className="p-2 rounded-lg transition-colors disabled:opacity-40"
              style={{ color: 'var(--color-danger)', border: '1px solid rgba(248,113,113,0.25)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(248,113,113,0.08)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
              title="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
          <button type="button" onClick={onClose} className="flex-1 btn-ghost">Annuler</button>
          <button type="submit" form="task-drawer-form" disabled={saving || deleting || !title.trim()} className="flex-1 btn-primary">
            {saving ? 'Enregistrement…' : task ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TaskList({ tasks, users, categories, canManage, currentUserId }: TaskListProps) {
  const router = useRouter()
  const [filter,           setFilter]           = useState<Filter>('ALL')
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [drawer,           setDrawer]           = useState<DrawerState>({ open: false, task: null })
  const [updatingId,       setUpdatingId]       = useState<string | null>(null)

  const counts: Record<Filter, number> = {
    ALL:         tasks.length,
    TODO:        tasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE:        tasks.filter((t) => t.status === 'DONE').length,
  }

  const mine    = tasks.filter((t) => t.assignedTo === currentUserId).length
  const donePct = tasks.length ? Math.round((counts.DONE / tasks.length) * 100) : 0

  const filtered = tasks
    .filter((t) => filter === 'ALL' || t.status === filter)
    .filter((t) => !filterCategoryId || t.categoryId === filterCategoryId)

  function openCreate() { setDrawer({ open: true, task: null }) }
  function openEdit(task: Task) { setDrawer({ open: true, task }) }
  function closeDrawer() { setDrawer((d) => ({ ...d, open: false })) }
  function handleSuccess() { closeDrawer(); router.refresh() }

  async function updateStatus(id: string, status: Task['status']) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        toastError(apiErrorMessage(res.status, data.error))
      }
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Progression</span>
            <span className="text-xs font-semibold" style={{ color: donePct === 100 ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
              {donePct}% · {counts.DONE}/{tasks.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${donePct}%`, backgroundColor: donePct === 100 ? 'var(--color-success)' : 'var(--color-accent)' }} />
          </div>
        </div>
      )}

      {/* Stats bar */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap px-4 py-2.5 rounded-lg mb-5 text-xs"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Mes tâches :</span>
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{mine}</span>
          </div>
          <span style={{ color: 'var(--color-border)' }}>·</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-warning)' }} />
            <span style={{ color: 'var(--color-text-muted)' }}>En cours :</span>
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{counts.IN_PROGRESS}</span>
          </div>
          <span style={{ color: 'var(--color-border)' }}>·</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-text-muted)' }} />
            <span style={{ color: 'var(--color-text-muted)' }}>À faire :</span>
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{counts.TODO}</span>
          </div>
        </div>
      )}

      {/* Status filters + create button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-2 text-sm font-medium rounded-md transition-colors"
              style={filter === f
                ? { backgroundColor: 'var(--color-accent)', color: 'var(--color-bg-primary)' }
                : { color: 'var(--color-text-muted)' }
              }
            >
              {FILTER_LABELS[f]}
              <span className="ml-1.5 text-xs" style={{ color: filter === f ? 'rgba(10,10,11,0.6)' : 'var(--color-text-muted)' }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 sm:ml-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvelle tâche
          </button>
        )}
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setFilterCategoryId(null)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
            style={!filterCategoryId
              ? { backgroundColor: 'var(--color-text-muted)', color: 'var(--color-bg-primary)' }
              : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
            }
          >
            Toutes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
              style={filterCategoryId === cat.id
                ? { backgroundColor: cat.color, color: '#000', opacity: 1 }
                : { backgroundColor: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}55` }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color, opacity: filterCategoryId === cat.id ? 0.6 : 1 }} />
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {filter === 'ALL' && !filterCategoryId
            ? 'Aucune tâche pour le moment.'
            : 'Aucune tâche pour ce filtre.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const meta    = STATUS_META[task.status]
            const overdue = isOverdue(task)
            const isAssignedToMe = task.assignedTo === currentUserId
            return (
              <div key={task.id}
                className={`card p-4 flex items-start gap-4 group ${task.status === 'DONE' ? 'opacity-60' : ''}`}
                style={task.categoryColor ? { borderLeft: `3px solid ${task.categoryColor}` } : undefined}
              >
                {/* Status toggle */}
                <button
                  onClick={() => updateStatus(task.id, STATUS_CYCLE[task.status])}
                  disabled={updatingId === task.id}
                  title={`Passer à ${STATUS_META[STATUS_CYCLE[task.status]].label}`}
                  className="mt-0.5 shrink-0 w-11 h-11 -m-3 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                  onMouseEnter={(e) => {
                    const inner = e.currentTarget.querySelector('[data-circle]') as HTMLElement | null
                    if (inner && task.status !== 'DONE') inner.style.borderColor = 'var(--color-accent)'
                  }}
                  onMouseLeave={(e) => {
                    const inner = e.currentTarget.querySelector('[data-circle]') as HTMLElement | null
                    if (inner && task.status !== 'DONE') inner.style.borderColor = 'var(--color-border)'
                  }}
                >
                  <span data-circle=""
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors pointer-events-none"
                    style={task.status === 'DONE'
                      ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }
                      : { borderColor: 'var(--color-border)' }
                    }
                  >
                    {task.status === 'DONE' && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through' : ''}`}
                      style={{ color: task.status === 'DONE' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
                      {task.title}
                      {isAssignedToMe && task.status !== 'DONE' && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ color: 'var(--color-accent)', backgroundColor: 'rgba(224,117,71,0.08)', border: '1px solid rgba(224,117,71,0.20)' }}>
                          Moi
                        </span>
                      )}
                    </p>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={meta.style}>
                      {meta.label}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {/* Category badge */}
                    {task.categoryName && task.categoryColor && (
                      <span className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded"
                        style={{ color: task.categoryColor, backgroundColor: `${task.categoryColor}18`, border: `1px solid ${task.categoryColor}40` }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.categoryColor }} />
                        {task.categoryName}
                      </span>
                    )}

                    {task.assigneeName && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        {task.assigneeName}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-xs"
                        style={{ color: overdue ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
                        </svg>
                        {overdue ? 'Retard · ' : ''}{fmtDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                {canManage && (
                  <button onClick={() => openEdit(task)}
                    className="shrink-0 mt-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2.5 rounded-lg"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
                    title="Modifier"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <TaskDrawer
        drawer={drawer}
        users={users}
        categories={categories}
        canManage={canManage}
        onClose={closeDrawer}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
