'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info, Loader2, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  hash?: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => string;
  updateToast: (id: string, update: Partial<Omit<ToastItem, 'id'>>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...t, id }]);
    // Auto dismiss after 7 seconds unless it's a loading toast
    if (t.kind !== 'loading') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 7000);
    }
    return id;
  }, []);

  const updateToast = useCallback((id: string, update: Partial<Omit<ToastItem, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...update } as ToastItem : t))
    );
    // Trigger auto-dismiss if updated from loading to success/error
    if (update.kind && update.kind !== 'loading') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 7000);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, pushToast, updateToast, dismissToast }}>
      {children}
      <ToastStack />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastStack() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-md">
      {toasts.map((t) => {
        let Icon = Info;
        let colorClass = 'border-slate-800 text-slate-300';
        
        if (t.kind === 'success') {
          Icon = CheckCircle;
          colorClass = 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5';
        } else if (t.kind === 'error') {
          Icon = AlertTriangle;
          colorClass = 'border-red-500/20 text-red-400 bg-red-500/5';
        } else if (t.kind === 'loading') {
          Icon = Loader2;
          colorClass = 'border-amber-500/20 text-amber-400 bg-amber-500/5';
        }

        return (
          <div
            key={t.id}
            className={`court-panel p-4 flex gap-3 items-start justify-between rounded-lg backdrop-blur-md border ${colorClass}`}
          >
            <div className="flex gap-3">
              <div className="mt-0.5">
                {t.kind === 'loading' ? (
                  <Icon className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="font-display font-bold text-sm tracking-wide">{t.title}</h4>
                {t.message && <p className="text-xs text-slate-400 mt-1">{t.message}</p>}
                {t.hash && (
                  <a
                    href={`https://explorer-bradbury.genlayer.com/tx/${t.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-amber-500 hover:underline mt-2 inline-block font-mono"
                  >
                    View Tx: {t.hash.slice(0, 10)}...{t.hash.slice(-8)}
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
