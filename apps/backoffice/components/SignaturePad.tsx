'use client'

import { useRef, useEffect, useState } from 'react'

type Props = {
  label?: string
  disabled?: boolean
  initialValue?: string | null
  onSign: (dataUrl: string) => void
  onClear: () => void
}

export function SignaturePad({ label = 'Signature', disabled, initialValue, onSign, onClear }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const isDrawing  = useRef(false)
  const lastPos    = useRef<{ x: number; y: number } | null>(null)
  const [hasSig, setHasSig] = useState(!!initialValue)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineWidth   = 1.8
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.strokeStyle = '#e8e8e2'

    if (initialValue) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
      img.src = initialValue
    }
  }, [initialValue])

  function getXY(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const t = e.touches[0]
      if (!t) return null
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    e.preventDefault()
    const pos = getXY(e)
    if (!pos) return
    isDrawing.current = true
    lastPos.current   = pos
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx    = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    const pos = getXY(e)
    if (!pos || !lastPos.current) return
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  function endDraw() {
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPos.current   = null
    const canvas = canvasRef.current
    if (!canvas) return
    setHasSig(true)
    onSign(canvas.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx    = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
    onClear()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {label} <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        {hasSig && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Effacer
          </button>
        )}
      </div>

      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          border: `1.5px ${hasSig ? 'solid' : 'dashed'} ${hasSig ? 'rgba(224,117,71,0.45)' : 'var(--color-border)'}`,
          backgroundColor: 'rgba(255,255,255,0.015)',
          transition: 'border-color 0.2s',
        }}
      >
        {!hasSig && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Signez ici</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full block select-none"
          style={{
            height: '96px',
            cursor: disabled ? 'default' : 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {!hasSig && !disabled && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Obligatoire avant de soumettre
        </p>
      )}
    </div>
  )
}

// Affichage en lecture seule d'une signature déjà enregistrée
export function SignatureImage({
  dataUrl,
  label,
  name,
  date,
}: {
  dataUrl: string
  label: string
  name?: string
  date?: string | null
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
        {date && (
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div
        className="rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          border: '1px solid rgba(52,211,153,0.30)',
          backgroundColor: 'rgba(52,211,153,0.04)',
          height: '80px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
      {name && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{name}</p>
      )}
    </div>
  )
}
