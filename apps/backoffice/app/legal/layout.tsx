import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documents légaux — Staffizi',
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9' }}>
      {children}
    </div>
  )
}
