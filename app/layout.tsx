import type { Metadata } from 'next';
import './globals.css';
import { ClientThemeProvider } from './ClientThemeProvider';

export const metadata: Metadata = {
  title: 'Premotion',
  description: 'Video catalog for pre-production review',
};

// Inlined from hudsonkit getHudsonThemeScript({ defaultTheme: 'dark' })
const THEME_SCRIPT = `!function(k,t,p){try{var d=document.documentElement,q=new URLSearchParams(location.search),s=JSON.parse(localStorage.getItem(k)||'{}'),x=q.get('theme')||s.theme||t,y=q.get('template')||s.template||p,m='system'===x&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'system'===x?'light':x;d.dataset.hudsonTheme=m,d.dataset.hudsonTemplate=y}catch(e){var d=document.documentElement,m='system'===t&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'system'===t?'light':t;d.dataset.hudsonTheme=m,d.dataset.hudsonTemplate=p}}('hudson.theme','dark','hudson');`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs in SSR — sets data-hudson-theme before paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ClientThemeProvider>{children}</ClientThemeProvider>
      </body>
    </html>
  );
}
