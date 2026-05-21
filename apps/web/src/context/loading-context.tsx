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
import { CmProgressBar } from '@/components/CmProgressBar';
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
      {active ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[200] px-0"
          aria-hidden={false}
        >
          <div className="border-b border-zinc-800/80 bg-zinc-950/95 px-4 py-2 shadow-md backdrop-blur-sm">
            <CmProgressBar label={label} />
          </div>
        </div>
      ) : null}
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
