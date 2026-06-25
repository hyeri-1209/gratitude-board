import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '🍀 감사 일기',
  description: '오늘 감사한 일을 적어보세요',
  openGraph: {
    title: '🍀 감사 일기',
    description: '오늘 감사한 일을 적어보세요',
    siteName: '감사 일기',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}