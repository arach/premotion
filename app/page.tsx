'use client';

import { Suspense } from 'react';
import { AppShell } from '@hudsonos/sdk/app-shell';
import { catalogApp } from '@/catalog';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppShell app={catalogApp} assistant={false} />
    </Suspense>
  );
}
