import { toast } from 'sonner'

// ── Shared style base ──────────────────────────────────────────────────────────

const base = {
  style: {
    fontFamily: "var(--font-dm-sans, -apple-system, 'Segoe UI', system-ui, sans-serif)",
    fontSize: '14px',
    borderRadius: '10px',
    border: '1px solid',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  },
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function toastSuccess(message: string) {
  toast.success(message, {
    ...base,
    style: {
      ...base.style,
      background: 'rgba(18, 36, 32, 0.97)',
      borderColor: 'rgba(107, 182, 163, 0.35)',
      color: '#D1FAF0',
    },
    duration: 3000,
  })
}

export function toastError(message: string) {
  toast.error(message, {
    ...base,
    style: {
      ...base.style,
      background: 'rgba(36, 18, 18, 0.97)',
      borderColor: 'rgba(217, 126, 114, 0.35)',
      color: '#FED7D2',
    },
    duration: 4000,
  })
}

export function toastInfo(message: string) {
  toast(message, {
    ...base,
    style: {
      ...base.style,
      background: 'rgba(15, 25, 40, 0.97)',
      borderColor: 'rgba(135, 206, 235, 0.30)',
      color: '#BAE8FB',
    },
    duration: 3000,
  })
}

// ── HTTP error → French message ────────────────────────────────────────────────

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Requête invalide — vérifiez les informations saisies',
  401: 'Session expirée — reconnectez-vous',
  403: "Vous n'avez pas les droits nécessaires",
  404: 'Ressource introuvable',
  409: 'Cette ressource est déjà utilisée à ce créneau',
  422: 'Vérifiez les informations saisies',
  429: 'Trop de requêtes — réessayez dans un instant',
  500: 'Erreur serveur — réessayez dans un instant',
  502: 'Service temporairement indisponible',
  503: 'Service en maintenance — réessayez plus tard',
}

const DOMAIN_MESSAGES: Record<string, string> = {
  // Reservations
  'créneau est déjà réservé':     'Ce créneau est déjà réservé',
  'déjà réservé sur cet intervalle': 'Ce créneau est déjà occupé',
  'dans le passé':                'La date ne peut pas être dans le passé',
  'Cannot transition':            'Transition de statut non autorisée',
  // Planning
  'shift already exists':         'Un shift existe déjà sur ce créneau',
  'overlapping shift':            'Ce shift chevauche un shift existant',
  // Auth
  'PIN incorrect':                'PIN incorrect — réessayez',
  'Invalid credentials':          'Identifiants incorrects',
  // Generic
  'Forbidden':                    "Accès refusé",
  'Establishment required':       'Établissement non sélectionné',
}

export function apiErrorMessage(status: number, serverMsg?: string): string {
  // Try to match a known domain-specific phrase first
  if (serverMsg) {
    for (const [key, msg] of Object.entries(DOMAIN_MESSAGES)) {
      if (serverMsg.toLowerCase().includes(key.toLowerCase())) return msg
    }
    // If the server already returned French text, prefer it
    if (/[àâéèêëîïôùûüçœæ]/i.test(serverMsg) || serverMsg.includes('é') || serverMsg.includes('è')) {
      return serverMsg
    }
  }

  // Specific 409/422 with context-aware fallbacks
  if (status === 409) return 'Ce créneau est déjà occupé par une autre ressource'
  if (status === 422) return serverMsg ?? 'Vérifiez les informations saisies'

  return HTTP_MESSAGES[status] ?? serverMsg ?? 'Une erreur inattendue est survenue'
}

/** Fetch a JSON endpoint, show toast on error, return null on failure. */
export async function fetchWithToast<T>(
  input: RequestInfo,
  init?: RequestInit,
  successMsg?: string,
): Promise<T | null> {
  try {
    const res = await fetch(input, init)
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      toastError(apiErrorMessage(res.status, data.error))
      return null
    }
    if (successMsg) toastSuccess(successMsg)
    return res.json() as Promise<T>
  } catch {
    toastError('Erreur réseau — vérifiez votre connexion')
    return null
  }
}
