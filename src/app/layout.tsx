import type { Metadata, Viewport } from 'next';
import { Gowun_Batang, Jua } from 'next/font/google';

import { Header } from '@/components/header';
import './globals.css';

const gowunBatang = Gowun_Batang({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-gowun',
  display: 'swap',
});

const jua = Jua({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-jua',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '레시픽 - 당신이 본 요리 영상, 스마트하게 픽하다',
  description:
    'YouTube 링크만 입력하면 AI가 자동으로 레시피를 추출해드립니다. 재료, 조리 순서, 팁까지 깔끔하게.',
  openGraph: {
    title: '레시픽 (Recipick)',
    description: '당신이 본 요리 영상, 스마트하게 픽하다',
    siteName: '레시픽',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '레시픽 (Recipick)',
    description: '당신이 본 요리 영상, 스마트하게 픽하다',
  },
};

export const viewport: Viewport = {
  themeColor: '#fce4ec',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${gowunBatang.variable} ${jua.variable} h-full antialiased`}
    >
      <body className="bg-background font-body text-foreground flex min-h-full flex-col">
        <Header />
        {children}
      </body>
    </html>
  );
}
