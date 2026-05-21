'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { registerLoadingHandlers } from '@/lib/loading-bus';

type LoadingContextValue = {
  begin: (label?: string) => void;
  end: () => void;
  active: boolean;
  label: string;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const countRef = useRef(0);
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState('Bezig…');

  const begin = useCallback((nextLabel?: string) => {
    countRef.current += 1;
    if (nextLabel) setLabel(nextLabel);
    setActive(true);
  }, []);

  const end = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) setActive(false);
  }, []);

  useEffect(() => {
    registerLoadingHandlers({ begin, end });
    return () => registerLoadingHandlers(null);
  }, [begin, end]);

  return (
    <LoadingContext.Provider value={{ begin, end, active, label }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    return {
      begin: () => undefined,
      end: () => undefined,
      active: false,
      label: '',
    };
  }
  return ctx;
}
