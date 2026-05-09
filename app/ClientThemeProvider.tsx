'use client';

import { ThemeProvider } from 'hudsonkit/theme';
import type { ReactNode } from 'react';

export function ClientThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>;
}
