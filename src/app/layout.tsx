import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZapOne — Central de Atendimento WhatsApp',
  description: 'Plataforma SaaS de atendimento WhatsApp com API oficial da Meta',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>{children}</body>
    </html>
  )
}
