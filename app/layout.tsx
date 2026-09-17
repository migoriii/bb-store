import type { Metadata } from 'next'
import { SiteShell } from '@/components/site-shell'
import './globals.css'

export const metadata: Metadata = {
  title: 'BB Store',
  description: 'Simple local ordering for food, rice, eggs, and frozen goods.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}
