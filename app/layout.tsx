import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import './globals.css';
import { StoreProvider } from '@/lib/store-context';
import { Shell } from '@/components/shell';

export const metadata: Metadata = {
  title: '颯エンタープライズ 工事管理',
  description: '建設事業部 工事管理 デモ用Webアプリ（サンプルデータ）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;500;700&display=swap" />
      </head>
      <body>
        <StoreProvider>
          <Suspense fallback={null}>
            <Shell>{children}</Shell>
          </Suspense>
        </StoreProvider>
      </body>
    </html>
  );
}
