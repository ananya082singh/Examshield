import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ExamShield | Secure Exam Distribution & Leak Traceability',
  description: 'A cybersecurity-focused platform for secure, time-locked exam distribution with dynamic forensic watermarking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} bg-slate-950 text-slate-50 h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
