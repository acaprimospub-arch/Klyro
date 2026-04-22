'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Design tokens ─────────────────────────────────────────────────────────────

const s = {
  bg:          '#09090B',
  bgCard:      '#111113',
  bgElevated:  '#18181B',
  border:      '#27272A',
  borderHi:    '#3F3F46',
  textPrimary: '#FAFAF9',
  textSec:     '#A1A1AA',
  textMuted:   '#71717A',
  accent:      '#00D4FF',
  accentDim:   'rgba(0,212,255,0.12)',
  accentBorder:'rgba(0,212,255,0.3)',
  success:     '#34D399',
  successDim:  'rgba(52,211,153,0.1)',
  danger:      '#F87171',
  dangerDim:   'rgba(248,113,113,0.1)',
}

const input: React.CSSProperties = {
  backgroundColor: s.bgCard,
  border: `1px solid ${s.border}`,
  color: s.textPrimary,
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ESTABLISHMENT_TYPES = [
  'Restaurant', 'Bar', 'Café', 'Brasserie', 'Hôtel', 'Hôtel-Restaurant',
  'Fast food', 'Traiteur', 'Discothèque', 'Autre',
]

const DEFAULT_POSITIONS = [
  'Serveur', 'Barman', 'Chef de rang', 'Cuisiner', 'Plongeur',
  'Hôtesse d\'accueil', 'Sommelier', 'Manager', 'Sécurité',
]

const DEFAULT_TASK_CATEGORIES = [
  'Nettoyage', 'Service en salle', 'Bar', 'Cuisine', 'Mise en place',
  'Fermeture', 'Réapprovisionnement', 'Inventaire',
]

const STEPS = [
  { n: 1, label: 'Établissement' },
  { n: 2, label: 'Directeur' },
  { n: 3, label: 'Templates' },
  { n: 4, label: 'Récapitulatif' },
]

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const special = '!@#$'
  let pwd = 'K'
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  pwd += special[Math.floor(Math.random() * special.length)]
  pwd += Math.floor(Math.random() * 90 + 10)
  return pwd
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1.5" style={{ color: s.textMuted }}>{children}</label>
}

function ErrorMsg({ msg }: { msg: string }) {
  return msg ? <p className="text-xs mt-1" style={{ color: s.danger }}>{msg}</p> : null
}

function CheckItem({ checked, onChange, label, sublabel }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
      style={{
        backgroundColor: checked ? s.accentDim : s.bgCard,
        border: `1px solid ${checked ? s.accentBorder : s.border}`,
      }}
    >
      <div
        className="w-4 h-4 rounded flex items-center justify-center shrink-0"
        style={{
          backgroundColor: checked ? s.accent : 'transparent',
          border: `1.5px solid ${checked ? s.accent : s.borderHi}`,
        }}
      >
        {checked && (
          <svg className="w-2.5 h-2.5" style={{ color: '#000' }} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>
      <div>
        <span className="text-sm" style={{ color: checked ? s.accent : s.textPrimary }}>{label}</span>
        {sublabel && <span className="text-xs ml-2" style={{ color: s.textMuted }}>{sublabel}</span>}
      </div>
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: s.textMuted }}>
      {children}
    </h3>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type SuccessData = {
  establishment: { id: string; name: string; address: string }
  director: { id: string; firstName: string; lastName: string; email: string }
  password: string
}

export function OnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [copied, setCopied] = useState(false)

  // ── Step 1: Establishment ─────────────────────────────────────────────────
  const [estName,         setEstName]         = useState('')
  const [estAddress,      setEstAddress]       = useState('')
  const [estPhone,        setEstPhone]         = useState('')
  const [estContactEmail, setEstContactEmail]  = useState('')
  const [estType,         setEstType]          = useState('')
  const [estEmployees,    setEstEmployees]      = useState('')
  const [estErrors,       setEstErrors]        = useState<Record<string, string>>({})

  // ── Step 2: Director ──────────────────────────────────────────────────────
  const [dirFirst,   setDirFirst]   = useState('')
  const [dirLast,    setDirLast]    = useState('')
  const [dirEmail,   setDirEmail]   = useState('')
  const [dirPassword,setDirPassword]= useState(() => generatePassword())
  const [sendEmail,  setSendEmail]  = useState(true)
  const [showPass,   setShowPass]   = useState(false)
  const [dirErrors,  setDirErrors]  = useState<Record<string, string>>({})

  // ── Step 3: Templates ─────────────────────────────────────────────────────
  const [selPositions, setSelPositions] = useState<Set<string>>(
    () => new Set(DEFAULT_POSITIONS)
  )
  const [selCategories, setSelCategories] = useState<Set<string>>(
    () => new Set(DEFAULT_TASK_CATEGORIES)
  )

  // ── Validation ────────────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const errs: Record<string, string> = {}
    if (!estName.trim())    errs['name']    = 'Nom requis'
    if (!estAddress.trim()) errs['address'] = 'Adresse requise'
    if (estContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(estContactEmail))
      errs['contactEmail'] = 'Email invalide'
    setEstErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {}
    if (!dirFirst.trim())   errs['firstName'] = 'Prénom requis'
    if (!dirLast.trim())    errs['lastName']  = 'Nom requis'
    if (!dirEmail.trim())   errs['email']     = 'Email requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dirEmail)) errs['email'] = 'Email invalide'
    if (dirPassword.length < 6) errs['password'] = 'Mot de passe trop court'
    setDirErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep((s) => s + 1)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function submit() {
    setSubmitting(true); setGlobalError('')
    try {
      const res = await fetch('/api/admin/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment: {
            name:         estName.trim(),
            address:      estAddress.trim(),
            phone:        estPhone.trim()        || undefined,
            contactEmail: estContactEmail.trim() || undefined,
            type:         estType                || undefined,
          },
          director: {
            firstName: dirFirst.trim(),
            lastName:  dirLast.trim(),
            email:     dirEmail.trim(),
            password:  dirPassword,
          },
          templates: {
            positions:      Array.from(selPositions),
            taskCategories: Array.from(selCategories),
          },
          sendWelcomeEmail: sendEmail,
        }),
      })

      if (!res.ok) {
        const j = await res.json()
        setGlobalError(j.error ?? 'Erreur lors de la création')
        return
      }

      const data = await res.json()
      setSuccess({ ...data, password: dirPassword })
    } finally {
      setSubmitting(false)
    }
  }

  async function copyCredentials() {
    if (!success) return
    const text = `Établissement : ${success.establishment.name}\nEmail : ${success.director.email}\nMot de passe : ${success.password}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: s.bg }}>
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl p-8 flex flex-col gap-6"
            style={{ backgroundColor: s.bgCard, border: `1px solid ${s.border}` }}
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: s.successDim, border: `1px solid rgba(52,211,153,0.3)` }}
              >
                <svg className="w-7 h-7" style={{ color: s.success }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold mb-1" style={{ color: s.textPrimary }}>
                Établissement créé !
              </h1>
              <p className="text-sm" style={{ color: s.textMuted }}>
                {success.establishment.name} est prêt à utiliser Klyro.
              </p>
            </div>

            {/* Credentials card */}
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ backgroundColor: s.bgElevated, border: `1px solid ${s.borderHi}` }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: s.textMuted }}>
                Identifiants DIRECTEUR
              </p>
              <div className="flex flex-col gap-2">
                <CredentialRow label="Nom" value={`${success.director.firstName} ${success.director.lastName}`} />
                <CredentialRow label="Email" value={success.director.email} />
                <CredentialRow label="Mot de passe" value={success.password} mono />
              </div>
            </div>

            <p className="text-xs text-center" style={{ color: s.textMuted }}>
              Communiquez ces identifiants au directeur. Le mot de passe ne sera plus visible après cette page.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={copyCredentials}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: s.accent, color: '#000' }}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Copié !
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copier les identifiants
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: s.textSec, border: `1px solid ${s.border}`, backgroundColor: 'transparent' }}
              >
                Terminer → Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Multi-step form ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: s.bg, color: s.textPrimary }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: s.bgCard, borderBottom: `1px solid ${s.border}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: s.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = s.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = s.textMuted)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </button>
          <span style={{ color: s.border }}>·</span>
          <span className="text-xs font-medium" style={{ color: s.textPrimary }}>Intégrer un nouveau client</span>
        </div>
        <span className="text-xs" style={{ color: s.textMuted }}>Étape {step} / {STEPS.length}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Step indicator ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((st, i) => (
            <div key={st.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={
                    step > st.n
                      ? { backgroundColor: s.success, color: '#000' }
                      : step === st.n
                      ? { backgroundColor: s.accent, color: '#000' }
                      : { backgroundColor: s.bgElevated, color: s.textMuted, border: `1px solid ${s.border}` }
                  }
                >
                  {step > st.n ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : st.n}
                </div>
                <span
                  className="text-[10px] font-medium whitespace-nowrap"
                  style={{ color: step === st.n ? s.textPrimary : s.textMuted }}
                >
                  {st.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-2 mb-4"
                  style={{ backgroundColor: step > st.n ? s.success : s.border }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Établissement ────────────────────────────────────────── */}
        {step === 1 && (
          <Card title="Informations de l'établissement" subtitle="Les informations de base du nouveau client">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nom de l'établissement *</Label>
                <input type="text" value={estName} onChange={(e) => setEstName(e.target.value)}
                  placeholder="Le Bistrot Parisien" style={input} autoFocus
                  onFocus={(e) => (e.target.style.borderColor = s.accent)}
                  onBlur={(e) => (e.target.style.borderColor = s.border)} />
                <ErrorMsg msg={estErrors['name'] ?? ''} />
              </div>

              <div className="sm:col-span-2">
                <Label>Adresse *</Label>
                <input type="text" value={estAddress} onChange={(e) => setEstAddress(e.target.value)}
                  placeholder="12 rue de la Paix, 75001 Paris" style={input}
                  onFocus={(e) => (e.target.style.borderColor = s.accent)}
                  onBlur={(e) => (e.target.style.borderColor = s.border)} />
                <ErrorMsg msg={estErrors['address'] ?? ''} />
              </div>

              <div>
                <Label>Téléphone</Label>
                <input type="tel" value={estPhone} onChange={(e) => setEstPhone(e.target.value)}
                  placeholder="+33 1 23 45 67 89" style={input}
                  onFocus={(e) => (e.target.style.borderColor = s.accent)}
                  onBlur={(e) => (e.target.style.borderColor = s.border)} />
              </div>

              <div>
                <Label>Email de contact</Label>
                <input type="email" value={estContactEmail} onChange={(e) => setEstContactEmail(e.target.value)}
                  placeholder="contact@bistrot.fr" style={input}
                  onFocus={(e) => (e.target.style.borderColor = s.accent)}
                  onBlur={(e) => (e.target.style.borderColor = s.border)} />
                <ErrorMsg msg={estErrors['contactEmail'] ?? ''} />
              </div>

              <div>
                <Label>Type d'établissement</Label>
                <select value={estType} onChange={(e) => setEstType(e.target.value)}
                  style={{ ...input, appearance: 'none' as const, cursor: 'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  {ESTABLISHMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Nombre d'employés estimé</Label>
                <input type="number" min="1" max="500" value={estEmployees} onChange={(e) => setEstEmployees(e.target.value)}
                  placeholder="ex: 12" style={input}
                  onFocus={(e) => (e.target.style.borderColor = s.accent)}
                  onBlur={(e) => (e.target.style.borderColor = s.border)} />
                <p className="text-xs mt-1" style={{ color: s.textMuted }}>Optionnel, aide à configurer les templates</p>
              </div>
            </div>
          </Card>
        )}

        {/* ── Step 2: Director ─────────────────────────────────────────────── */}
        {step === 2 && (
          <Card title="Compte Directeur" subtitle="Le premier accès admin de l'établissement">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Prénom *</Label>
                <input type="text" value={dirFirst} onChange={(e) => setDirFirst(e.target.value)}
                  placeholder="Marie" style={input} autoFocus
                  onFocus={(e) => (e.target.style.borderColor = s.accent)}
                  onBlur={(e) => (e.target.style.borderColor = s.border)} />
                <ErrorMsg msg={dirErrors['firstName'] ?? ''} />
              </div>
              <div>
                <Label>Nom *</Label>
                <input type="text" value={dirLast} onChange={(e) => setDirLast(e.target.value)}
                  placeholder="Dupont" style={input}
                  onFocus={(e) => (e.target.style.borderColor = s.accent)}
                  onBlur={(e) => (e.target.style.borderColor = s.border)} />
                <ErrorMsg msg={dirErrors['lastName'] ?? ''} />
              </div>
              <div className="sm:col-span-2">
                <Label>Email *</Label>
                <input type="email" value={dirEmail} onChange={(e) => setDirEmail(e.target.value)}
                  placeholder="marie.dupont@bistrot.fr" style={input}
                  onFocus={(e) => (e.target.style.borderColor = s.accent)}
                  onBlur={(e) => (e.target.style.borderColor = s.border)} />
                <ErrorMsg msg={dirErrors['email'] ?? ''} />
              </div>
              <div className="sm:col-span-2">
                <Label>Mot de passe temporaire</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={dirPassword}
                      onChange={(e) => setDirPassword(e.target.value)}
                      style={{ ...input, fontFamily: showPass ? 'monospace' : 'inherit', paddingRight: 80 }}
                      onFocus={(e) => (e.target.style.borderColor = s.accent)}
                      onBlur={(e) => (e.target.style.borderColor = s.border)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute inset-y-0 right-2 px-2 text-xs"
                      style={{ color: s.textMuted }}
                    >
                      {showPass ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDirPassword(generatePassword())}
                    className="px-3 py-2 rounded-lg text-xs font-medium shrink-0"
                    style={{ backgroundColor: s.bgElevated, color: s.textSec, border: `1px solid ${s.border}` }}
                    title="Regénérer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                </div>
                <ErrorMsg msg={dirErrors['password'] ?? ''} />
                <p className="text-xs mt-1.5" style={{ color: s.textMuted }}>
                  Généré automatiquement. À communiquer au directeur lors de l'activation.
                </p>
              </div>
            </div>

            <div className="mt-2">
              <CheckItem
                checked={sendEmail}
                onChange={setSendEmail}
                label="Envoyer un email de bienvenue"
                sublabel="(simulation — non implémenté)"
              />
            </div>
          </Card>
        )}

        {/* ── Step 3: Templates ────────────────────────────────────────────── */}
        {step === 3 && (
          <Card title="Templates par défaut" subtitle="Pré-remplir l'établissement avec des données de départ">
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>Types de postes</SectionTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelPositions(new Set(DEFAULT_POSITIONS))}
                      className="text-xs" style={{ color: s.accent }}
                    >Tout sélectionner</button>
                    <span style={{ color: s.border }}>·</span>
                    <button
                      onClick={() => setSelPositions(new Set())}
                      className="text-xs" style={{ color: s.textMuted }}
                    >Aucun</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {DEFAULT_POSITIONS.map((p) => (
                    <CheckItem
                      key={p}
                      checked={selPositions.has(p)}
                      onChange={(v) => setSelPositions((prev) => {
                        const next = new Set(prev)
                        v ? next.add(p) : next.delete(p)
                        return next
                      })}
                      label={p}
                    />
                  ))}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 24 }}>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>Catégories de tâches</SectionTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelCategories(new Set(DEFAULT_TASK_CATEGORIES))}
                      className="text-xs" style={{ color: s.accent }}
                    >Tout sélectionner</button>
                    <span style={{ color: s.border }}>·</span>
                    <button
                      onClick={() => setSelCategories(new Set())}
                      className="text-xs" style={{ color: s.textMuted }}
                    >Aucun</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {DEFAULT_TASK_CATEGORIES.map((c) => (
                    <CheckItem
                      key={c}
                      checked={selCategories.has(c)}
                      onChange={(v) => setSelCategories((prev) => {
                        const next = new Set(prev)
                        v ? next.add(c) : next.delete(c)
                        return next
                      })}
                      label={c}
                    />
                  ))}
                </div>
              </div>

              <div
                className="flex items-center gap-3 rounded-xl p-3 text-xs"
                style={{ backgroundColor: s.accentDim, border: `1px solid ${s.accentBorder}`, color: s.textSec }}
              >
                <svg className="w-4 h-4 shrink-0" style={{ color: s.accent }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                {selPositions.size + selCategories.size} templates sélectionnés — modifiables après création depuis le dashboard.
              </div>
            </div>
          </Card>
        )}

        {/* ── Step 4: Récapitulatif ────────────────────────────────────────── */}
        {step === 4 && (
          <Card title="Récapitulatif" subtitle="Vérifiez les informations avant de créer">
            <div className="flex flex-col gap-4">
              <RecapSection title="Établissement" onEdit={() => setStep(1)}>
                <RecapRow label="Nom"      value={estName} />
                <RecapRow label="Adresse"  value={estAddress} />
                {estPhone        && <RecapRow label="Téléphone"  value={estPhone} />}
                {estContactEmail && <RecapRow label="Email"      value={estContactEmail} />}
                {estType         && <RecapRow label="Type"       value={estType} />}
                {estEmployees    && <RecapRow label="Employés"   value={`~${estEmployees}`} />}
              </RecapSection>

              <RecapSection title="Directeur" onEdit={() => setStep(2)}>
                <RecapRow label="Nom"    value={`${dirFirst} ${dirLast}`} />
                <RecapRow label="Email"  value={dirEmail} />
                <RecapRow label="Mdp"    value="••••••••" mono />
              </RecapSection>

              <RecapSection title="Templates" onEdit={() => setStep(3)}>
                <RecapRow
                  label="Postes"
                  value={selPositions.size > 0 ? Array.from(selPositions).join(', ') : 'Aucun'}
                />
                <RecapRow
                  label="Catégories"
                  value={selCategories.size > 0 ? Array.from(selCategories).join(', ') : 'Aucune'}
                />
              </RecapSection>

              {globalError && (
                <div
                  className="flex items-center gap-2 rounded-xl p-3 text-sm"
                  style={{ backgroundColor: s.dangerDim, border: `1px solid rgba(248,113,113,0.3)`, color: s.danger }}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {globalError}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl transition-colors"
              style={{ color: s.textSec, border: `1px solid ${s.border}`, backgroundColor: 'transparent' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Précédent
            </button>
          ) : (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-sm px-4 py-2.5 rounded-xl transition-colors"
              style={{ color: s.textMuted }}
            >Annuler</button>
          )}

          {step < 4 ? (
            <button
              onClick={next}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-80"
              style={{ backgroundColor: s.accent, color: '#000' }}
            >
              Continuer
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: s.accent, color: '#000' }}
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Création en cours…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Créer l'établissement
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared layout primitives ──────────────────────────────────────────────────

function Card({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{ backgroundColor: s.bgCard, border: `1px solid ${s.border}` }}
    >
      <div>
        <h2 className="text-base font-semibold" style={{ color: s.textPrimary }}>{title}</h2>
        <p className="text-sm mt-0.5" style={{ color: s.textMuted }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function RecapSection({ title, onEdit, children }: {
  title: string; onEdit: () => void; children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${s.border}` }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: s.bgElevated, borderBottom: `1px solid ${s.border}` }}
      >
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: s.textMuted }}>
          {title}
        </span>
        <button onClick={onEdit} className="text-xs" style={{ color: s.accent }}>Modifier</button>
      </div>
      <div className="divide-y" style={{ '--tw-divide-color': s.border } as React.CSSProperties}>
        {children}
      </div>
    </div>
  )
}

function RecapRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="flex items-start gap-4 px-4 py-2.5"
      style={{ borderTop: `1px solid ${s.border}` }}
    >
      <span className="text-xs w-20 shrink-0 pt-0.5" style={{ color: s.textMuted }}>{label}</span>
      <span
        className="text-sm flex-1 break-all"
        style={{ color: s.textSec, fontFamily: mono ? 'monospace' : 'inherit' }}
      >
        {value}
      </span>
    </div>
  )
}

function CredentialRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-24 shrink-0" style={{ color: s.textMuted }}>{label}</span>
      <span
        className="text-sm font-medium break-all"
        style={{ color: s.textPrimary, fontFamily: mono ? 'monospace' : 'inherit' }}
      >
        {value}
      </span>
    </div>
  )
}
