'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { FX_PARAMS } from './slots/FxParams';

export type FxParamValues = Record<string, number | string | boolean>;

interface FxContextValue {
  fxSelectedId: string;
  setFxSelectedId: (id: string) => void;
  fxParams: FxParamValues;
  setFxParam: (name: string, value: number | string | boolean) => void;
  resetFxParams: () => void;
}

export const FxContext = createContext<FxContextValue | null>(null);

function defaultParams(id: string): FxParamValues {
  return Object.fromEntries((FX_PARAMS[id] ?? []).map(d => [d.name, d.default]));
}

const INITIAL_ID = 'film-grade';

export function FxProvider({ children }: { children: ReactNode }) {
  const [fxSelectedId, setIdRaw] = useState(INITIAL_ID);
  const [fxParams, setFxParams] = useState<FxParamValues>(() => defaultParams(INITIAL_ID));

  const setFxSelectedId = useCallback((id: string) => {
    setIdRaw(id);
    setFxParams(defaultParams(id));
  }, []);

  const setFxParam = useCallback((name: string, value: number | string | boolean) => {
    setFxParams(prev => ({ ...prev, [name]: value }));
  }, []);

  const resetFxParams = useCallback(() => {
    setFxParams(defaultParams(fxSelectedId));
  }, [fxSelectedId]);

  return (
    <FxContext.Provider value={{ fxSelectedId, setFxSelectedId, fxParams, setFxParam, resetFxParams }}>
      {children}
    </FxContext.Provider>
  );
}

export function useFx() {
  const ctx = useContext(FxContext);
  if (!ctx) throw new Error('useFx must be used inside FxProvider');
  return ctx;
}
