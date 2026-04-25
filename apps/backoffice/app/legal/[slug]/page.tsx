import { notFound } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Metadata } from 'next'

const DOCS: Record<string, { title: string }> = {
  'politique-confidentialite': { title: 'Politique de Confidentialité' },
  'cgu-cgv':                   { title: 'CGU / CGV' },
  'accord-traitement-donnees': { title: 'Accord de Traitement des Données' },
  'sla-support':               { title: 'SLA & Support' },
  'mentions-legales':          { title: 'Mentions Légales' },
}

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS[slug]
  if (!doc) return {}
  return { title: `${doc.title} — Staffizi` }
}

export default async function LegalDocPage({ params }: Params) {
  const { slug } = await params
  if (!DOCS[slug]) notFound()

  const filePath = join(process.cwd(), 'public', 'legal', `${slug}.html`)
  const html = readFileSync(filePath, 'utf-8')

  // Extract <body> content (includes <style> for standalone look)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyContent = bodyMatch?.[1] ?? html

  // Extract <style> from <head> so styling works when embedded
  const headStyleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const headStyle = headStyleMatch?.[1] ?? ''

  return (
    <>
      {headStyle && <style dangerouslySetInnerHTML={{ __html: headStyle }} />}
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </>
  )
}
