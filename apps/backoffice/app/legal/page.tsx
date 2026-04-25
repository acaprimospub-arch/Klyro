import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documents légaux — Staffizi',
}

const DOCS = [
  {
    slug: 'politique-confidentialite',
    title: 'Politique de Confidentialité',
    description: 'Données collectées, hébergement, durée de conservation, droits RGPD.',
    badge: 'RGPD',
    badgeColor: '#166534',
    badgeBg: '#dcfce7',
  },
  {
    slug: 'cgu-cgv',
    title: 'CGU / CGV',
    description: "Conditions d'utilisation, abonnement, paiement Stripe, résiliation.",
    badge: 'Contrat',
    badgeColor: '#1e3a8a',
    badgeBg: '#dbeafe',
  },
  {
    slug: 'accord-traitement-donnees',
    title: 'Accord de Traitement des Données',
    description: 'DPA RGPD art. 28 — obligations sous-traitant / responsable de traitement.',
    badge: 'DPA',
    badgeColor: '#5b21b6',
    badgeBg: '#ede9fe',
  },
  {
    slug: 'sla-support',
    title: 'SLA & Support',
    description: 'Uptime 99%, sauvegardes quotidiennes, délais de support et escalade.',
    badge: 'SLA',
    badgeColor: '#92400e',
    badgeBg: '#fef3c7',
  },
  {
    slug: 'mentions-legales',
    title: 'Mentions Légales',
    description: 'Éditeur, hébergeur Hostinger, propriété intellectuelle, contact légal.',
    badge: 'Légal',
    badgeColor: '#374151',
    badgeBg: '#f3f4f6',
  },
]

export default function LegalIndexPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem', fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', paddingBottom: '1.75rem', borderBottom: '2px solid #E07547' }}>
        <Link href="/" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E07547', letterSpacing: '-0.5px', textDecoration: 'none' }}>
          Staffizi
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0a0a0b', margin: '0.5rem 0 0.3rem', lineHeight: 1.2 }}>
          Documents légaux
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#71717a', margin: 0 }}>
          Tous les documents contractuels et réglementaires relatifs à l'utilisation de Staffizi.
        </p>
      </div>

      {/* Document list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {DOCS.map((doc) => (
          <Link
            key={doc.slug}
            href={`/legal/${doc.slug}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                background: '#fff',
                border: '1px solid #e4e4e7',
                borderRadius: 10,
                padding: '1.1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#E07547'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(224,117,71,0.12)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#e4e4e7'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0a0a0b' }}>{doc.title}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '0.15rem 0.55rem', borderRadius: 999,
                    color: doc.badgeColor, background: doc.badgeBg,
                  }}>
                    {doc.badge}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#71717a', margin: 0 }}>{doc.description}</p>
              </div>
              <svg style={{ flexShrink: 0, marginTop: '0.2rem', color: '#a1a1aa' }} width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e4e4e7', fontSize: '0.8rem', color: '#a1a1aa' }}>
        <p style={{ margin: 0 }}>
          Staffizi — édité par Arthur Capri ·{' '}
          <a href="mailto:acapri.mospub@gmail.com" style={{ color: '#E07547' }}>acapri.mospub@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
