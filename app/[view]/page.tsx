'use client';

import { Suspense } from 'react';
import { AppShell } from 'hudsonkit/app-shell';
import { catalogApp } from '@/catalog';

export default function ViewPage() {
  return (
    <Suspense fallback={null}>
      <AppShell app={catalogApp} assistant={false} defaultTheme="dark" managedTheme={false} />
    </Suspense>
  );
}
