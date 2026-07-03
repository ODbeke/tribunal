'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Escrow, fetchEscrow, fetchEscrows, fetchCourtStats, CourtStats } from '@/lib/contract';

export interface UseCourtData {
  escrows: Escrow[];
  stats: CourtStats;
  loading: boolean;
  busy: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setBusy: (busy: boolean) => void;
}

const DEFAULT_STATS: CourtStats = {
  total_escrows: 0,
  active_disputes: 0,
  resolved_disputes: 0,
};

export function useCourtData(): UseCourtData {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [stats, setStats] = useState<CourtStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCount = useRef(0);

  const refresh = useCallback(async () => {
    refreshCount.current += 1;
    const currentRun = refreshCount.current;
    
    setError(null);
    try {
      const [fetchedStats, fetchedEscrows] = await Promise.all([
        fetchCourtStats().catch((err) => {
          console.warn('Stats fetch failed, using default', err);
          return DEFAULT_STATS;
        }),
        fetchEscrows(0, 30).catch((err) => {
          console.warn('Escrows list fetch failed', err);
          return [];
        }),
      ]);

      if (currentRun !== refreshCount.current) return; // avoid state overwrite on race condition

      setStats(fetchedStats);
      setEscrows(fetchedEscrows);
    } catch (e) {
      if (currentRun === refreshCount.current) {
        setError('Failed to fetch latest court ledger data. Check node connection.');
      }
    } finally {
      if (currentRun === refreshCount.current) {
        setLoading(false);
      }
    }
  }, []);

  // Poll court ledger stats periodically
  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      refresh().catch(() => undefined);
    }, 25000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    escrows,
    stats,
    loading,
    busy,
    error,
    refresh,
    setBusy,
  };
}

export interface UseEscrowDetails {
  escrow: Escrow | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setBusy: (busy: boolean) => void;
}

export function useEscrowDetails(id: string, initialData?: Escrow): UseEscrowDetails {
  const [escrow, setEscrow] = useState<Escrow | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusyState] = useState(false);

  const refreshCount = useRef(0);

  const refresh = useCallback(async () => {
    if (!id) return;
    refreshCount.current += 1;
    const currentRun = refreshCount.current;

    setError(null);
    try {
      const data = await fetchEscrow(id);
      if (currentRun !== refreshCount.current) return;
      setEscrow(data);
    } catch (e) {
      if (currentRun === refreshCount.current) {
        setError('Failed to fetch details for this escrow record.');
      }
    } finally {
      if (currentRun === refreshCount.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [id, refresh]);

  return {
    escrow,
    loading,
    error,
    refresh,
    setBusy: setBusyState,
  };
}
