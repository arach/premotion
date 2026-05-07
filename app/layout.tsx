import type { Metadata } from 'next';
import { HudsonThemeScript } from 'hudsonkit/theme-script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Premotion',
  description: 'Video catalog for pre-production review',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HudsonThemeScript defaultTheme="dark" />
      </head>
      <body>{children}</body>
    </html>
  );
}
