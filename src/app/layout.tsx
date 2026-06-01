import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Novel — 小说创作助手',
  description: 'AI 辅助小说创作平台：帮你想清楚，不替你写',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
