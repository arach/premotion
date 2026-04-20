'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useCatalog } from './Provider';
import { useReview } from './hooks/useReview';

type ReviewState = ReturnType<typeof useReview>;

const ReviewContext = createContext<ReviewState | null>(null);

export function useReviewContext() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReviewContext must be used inside ReviewProvider');
  return ctx;
}

export function ReviewProvider({ children }: { children: ReactNode }) {
  const { selectedVideo } = useCatalog();
  const review = useReview(selectedVideo ?? null, !!selectedVideo);
  return (
    <ReviewContext.Provider value={review}>
      {children}
    </ReviewContext.Provider>
  );
}
