import type { Metadata } from 'next';
import './globals.css';
import './theme.css';
import './enhancements.css';
import './dossier.css';
import './revision.css';
import localFont from 'next/font/local';
const jakarta = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2',
      weight: '400',
    },
    {
      path: '../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2',
      weight: '500',
    },
    {
      path: '../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2',
      weight: '600',
    },
    {
      path: '../node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2',
      weight: '700',
    },
  ],
  variable: '--font-jakarta',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'InsuranceChain — Fraud Intelligence',
  description: 'Workspace kolaborasi fraud intelligence untuk konsorsium asuransi kesehatan.',
  icons: { icon: '/brand/insurancechain-original.png' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
