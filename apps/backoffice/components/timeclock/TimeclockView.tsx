'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Entry = {
  id: string
  userId: string
  firstName: string
  lastName: string
  clockIn: string
  clockOut: string | null
  workedMin: number
  active: boolean
}

type Props = {
  entries: Entry[]
  eid: string
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
}

// ─── Kiosk overlay ────────────────────────────────────────────────────────────

type KioskState = 'pin' | 'checking' | 'camera' | 'submitting' | 'result'

type ResultData = {
  type: 'arrivee' | 'depart'
  name: string
  timestamp: string
  workedMin: number | null
}

function KioskOverlay({ eid, onClose }: { eid: string; onClose: () => void }) {
  const [state, setState]       = useState<KioskState>('pin')
  const [pin, setPin]           = useState('')
  const [pinError, setPinError] = useState('')
  const [shaking, setShaking]   = useState(false)
  const [pendingName, setPendingName] = useState('')
  const [pendingType, setPendingType] = useState<'arrivee' | 'depart'>('arrivee')
  const [result, setResult]     = useState<ResultData | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [clockDisplay, setClockDisplay] = useState('')
  const [dateDisplay, setDateDisplay]   = useState('')

  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cdTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live clock
  useEffect(() => {
    function tick() {
      const now = new Date()
      setClockDisplay(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
      setDateDisplay(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Keyboard support
  useEffect(() => {
    if (state !== 'pin') return
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') pressKey(e.key)
      else if (e.key === 'Backspace') deleteKey()
      else if (e.key === 'Enter') void submitPin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function pressKey(k: string) {
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    setPinError('')
    if (next.length === 6) void submitPin(next)
  }

  function deleteKey() {
    setPin((p) => p.slice(0, -1))
    setPinError('')
  }

  function showPinError(msg: string) {
    setPinError(msg)
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
  }

  async function submitPin(currentPin?: string) {
    const p = currentPin ?? pin
    if (p.length < 4) { showPinError('Code PIN trop court'); return }
    setState('checking')
    try {
      const res = await fetch(`/api/timeclock/check?pin=${encodeURIComponent(p)}&eid=${eid}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'PIN inconnu')
      setPendingName(data.name)
      setPendingType(data.nextType)
      await startCamera()
    } catch (e: unknown) {
      setState('pin')
      setPin('')
      showPinError(e instanceof Error ? e.message : 'Erreur réseau')
    }
  }

  const stopCamera = useCallback(() => {
    if (cdTimerRef.current) { clearInterval(cdTimerRef.current); cdTimerRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setCountdown(null)
  }, [])

  async function startCamera() {
    setState('camera')
    const available = !!(navigator.mediaDevices?.getUserMedia)
    if (!available) {
      // No camera — proceed after 1.5s
      setTimeout(() => void captureAndSubmit(null), 1500)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      startCountdown()
    } catch {
      stopCamera()
      void captureAndSubmit(null)
    }
  }

  function startCountdown() {
    let count = 3
    setCountdown(count)
    cdTimerRef.current = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(cdTimerRef.current!)
        cdTimerRef.current = null
        setCountdown(null)
        void captureAndSubmit(capturePhoto())
      } else {
        setCountdown(count)
      }
    }, 1000)
  }

  function capturePhoto(): string | null {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    const w = video.videoWidth  || 640
    const h = video.videoHeight || 480
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.translate(w, 0); ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.85)
  }

  async function captureAndSubmit(_photo: string | null) {
    stopCamera()
    setState('submitting')
    try {
      const res = await fetch('/api/timeclock/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, establishmentId: eid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setResult(data as ResultData)
      setState('result')
      resetTimerRef.current = setTimeout(resetToPin, 4000)
    } catch (e: unknown) {
      setState('pin')
      setPin('')
      showPinError(e instanceof Error ? e.message : 'Erreur réseau')
    }
  }

  function resetToPin() {
    if (resetTimerRef.current) { clearTimeout(resetTimerRef.current); resetTimerRef.current = null }
    stopCamera()
    setPin('')
    setPendingName('')
    setPendingType('arrivee')
    setResult(null)
    setPinError('')
    setState('pin')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [stopCamera])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Close button */}
      <button
        onClick={() => { resetToPin(); onClose() }}
        className="absolute top-4 right-4 p-2 rounded-lg"
        style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
        aria-label="Quitter le mode kiosque"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="w-full max-w-sm px-4 flex flex-col items-center gap-5">

        {/* ── PIN screen ── */}
        {state === 'pin' && (
          <>
            <div className="text-center">
              <div
                className="text-3xl font-light tracking-wider mb-1"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {clockDisplay}
              </div>
              <div className="text-sm capitalize" style={{ color: 'var(--color-text-muted)' }}>
                {dateDisplay}
              </div>
            </div>

            {/* PIN dots */}
            <div className="flex gap-3 justify-center my-1">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border-2 transition-all"
                  style={i < pin.length
                    ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)', transform: 'scale(1.15)' }
                    : { borderColor: 'var(--color-border)' }
                  }
                />
              ))}
            </div>

            {/* PIN pad */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              {['1','2','3','4','5','6','7','8','9'].map((k) => (
                <button
                  key={k}
                  onClick={() => pressKey(k)}
                  className="rounded-xl text-2xl font-light h-16 transition-all active:scale-95"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-elevated)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-secondary)' }}
                >
                  {k}
                </button>
              ))}

              {/* Delete */}
              <button
                onClick={deleteKey}
                className="rounded-xl h-16 flex items-center justify-center transition-all active:scale-95"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <svg className="w-5 h-4" viewBox="0 0 20 16" fill="none">
                  <path d="M7 1H19a1 1 0 011 1v12a1 1 0 01-1 1H7L1 8l6-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M12 5l4 6M16 5l-4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* 0 */}
              <button
                onClick={() => pressKey('0')}
                className="rounded-xl text-2xl font-light h-16 transition-all active:scale-95"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-elevated)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-secondary)' }}
              >
                0
              </button>

              {/* OK */}
              <button
                onClick={() => void submitPin()}
                className="rounded-xl text-sm font-bold h-16 tracking-wider transition-all active:scale-95"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  border: '1px solid var(--color-accent)',
                  color: 'var(--color-bg-primary)',
                }}
              >
                OK
              </button>
            </div>

            {/* Error */}
            <div
              className={`h-5 text-sm text-center transition-all ${shaking ? 'animate-[shake_0.3s_ease-out]' : ''}`}
              style={{ color: 'var(--color-danger)' }}
            >
              {pinError}
            </div>
          </>
        )}

        {/* ── Checking / Submitting ── */}
        {(state === 'checking' || state === 'submitting') && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }}
            />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {state === 'checking' ? 'Vérification…' : 'Enregistrement…'}
            </p>
          </div>
        )}

        {/* ── Camera ── */}
        {state === 'camera' && (
          <>
            <div className="text-center">
              <p className="text-base font-semibold" style={{ color: 'var(--color-accent)' }}>
                {pendingType === 'arrivee' ? 'Pointage arrivée' : 'Pointage départ'}
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{pendingName}</p>
            </div>

            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {countdown !== null && (
                <div
                  className="absolute inset-0 flex items-center justify-center text-8xl font-bold"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    color: 'var(--color-accent)',
                    textShadow: '0 0 20px rgba(224,117,71,0.6)',
                  }}
                >
                  {countdown}
                </div>
              )}
            </div>

            <button
              onClick={() => { resetToPin() }}
              className="w-full py-3 rounded-xl text-sm transition-all"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              Annuler
            </button>
          </>
        )}

        {/* ── Result ── */}
        {state === 'result' && result && (
          <div
            className="w-full rounded-xl p-8 text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-5xl mb-3">
              {result.type === 'arrivee' ? '✅' : '👋'}
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {result.name}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {result.type === 'arrivee' ? 'Arrivée enregistrée' : 'Départ enregistré'}
            </p>
            <p className="text-3xl font-light mt-2" style={{ color: 'var(--color-text-primary)' }}>
              {fmtTime(result.timestamp)}
            </p>
            {result.type === 'depart' && result.workedMin !== null && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Durée : {fmtDuration(result.workedMin)}
              </p>
            )}
            {/* Progress bar auto-reset */}
            <div className="mt-5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  animation: 'shrink 4s linear forwards',
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      <style>{`
        @keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      `}</style>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function TimeclockView({ entries, eid }: Props) {
  const router = useRouter()
  const [kioskOpen, setKioskOpen] = useState(false)

  const active  = entries.filter((e) => e.active)
  const closed  = entries.filter((e) => !e.active)

  function handleKioskClose() {
    setKioskOpen(false)
    router.refresh()
  }

  return (
    <>
      {kioskOpen && <KioskOverlay eid={eid} onClose={handleKioskClose} />}

      {/* Stats bar */}
      <div
        className="flex items-center gap-4 flex-wrap px-4 py-2.5 rounded-lg mb-6 text-xs"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Présents :</span>
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{active.length}</span>
        </div>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-text-muted)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Partis :</span>
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{closed.length}</span>
        </div>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>Total entrées :</span>
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{entries.length}</span>
        </div>

        <button
          onClick={() => setKioskOpen(true)}
          className="btn-primary ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Mode kiosque
        </button>
      </div>

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Aucun pointage aujourd'hui.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="card p-4 flex items-center gap-4"
            >
              {/* Status dot */}
              <div
                className="shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.active ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                title={entry.active ? 'Présent' : 'Parti'}
              />

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {entry.firstName} {entry.lastName}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Arrivée {fmtTime(entry.clockIn)}</span>
                  {entry.clockOut && <span>· Départ {fmtTime(entry.clockOut)}</span>}
                </div>
              </div>

              {/* Duration */}
              <div className="text-right shrink-0">
                <span
                  className="text-sm font-semibold"
                  style={{ color: entry.active ? 'var(--color-success)' : 'var(--color-text-secondary)' }}
                >
                  {fmtDuration(entry.workedMin)}
                </span>
                {entry.active && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>en cours</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
