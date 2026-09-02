import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { siteConfig } from '@/content/business';

import '@/styles/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    'Pretzels, bagels y panes artesanales por encargo de Güteli Bakery.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={siteConfig.locale} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
