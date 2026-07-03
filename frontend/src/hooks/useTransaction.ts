'use client';

import { useCallback, useRef, useState } from 'react';
import { ArbitratorDraft, makeWalletClient, pollUntilDecided, WalletClient } from '@/lib/contract';

export type TxPhase = 'idle' | 'wallet' | 'submitted' | 'consensus' | 'confirmed' | 'error';

export interface TxState {
  phase: TxPhase;
  hash: `0x${string}` | null;
  liveStatus: string;
  draft: ArbitratorDraft | null;
  error: string | null;
}

const INITIAL_STATE: TxState = {
  phase: 'idle',
  hash: null,
  liveStatus: '',
  draft: null,
  error: null,
};

function formatErrorMessage(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? e);
  
  if (/LackOfFundForMaxFee|insufficient funds/i.test(msg)) {
    return 'Your account balance is below the fee reserve required for consensus AI operations. Please claim more GEN at the testnet faucet.';
  }
  if (/reject|denied|4001/i.test(msg)) {
    return 'Transaction signature request rejected by the user.';
  }
  if (/rate limit|429|too many/i.test(msg)) {
    return 'GenLayer node RPC rate limit exceeded. The arbitration transaction is still processing on-chain.';
  }
  if (/network|fetch/i.test(msg)) {
    return 'RPC network connectivity issue. Check your connection to the Bradbury node.';
  }
  if (/timeout/i.test(msg)) {
    return 'Arbitration transaction timed out, but validators may still be deliberating. Please check the transaction hash.';
  }

  // Parse custom revert message codes from the contract
  const matchExpected = msg.match(/\[REQUIRED\]\s*(.+)/i);
  if (matchExpected) return matchExpected[1].trim();

  const matchTribunalErr = msg.match(/\[TRIBUNAL_ERROR\]\s*(.+)/i);
  if (matchTribunalErr) return `Court execution error: ${matchTribunalErr[1].trim()}`;

  return 'The transaction failed to execute. Please verify inputs and try again.';
}

export interface TxRunnerOptions {
  account: `0x${string}`;
  send: (client: WalletClient) => Promise<unknown>;
  onConfirmed?: (status: string, draft: ArbitratorDraft | null) => void;
  onBusyToggle?: (isBusy: boolean) => void;
}

export interface UseTransactionHook {
  state: TxState;
  executeTx: (opts: TxRunnerOptions) => Promise<void>;
  resetTx: () => void;
}

export function useTransaction(): UseTransactionHook {
  const [state, setState] = useState<TxState>(INITIAL_STATE);
  const isExecuting = useRef(false);

  const resetTx = useCallback(() => setState(INITIAL_STATE), []);

  const executeTx = useCallback(async (opts: TxRunnerOptions) => {
    if (isExecuting.current) return;
    isExecuting.current = true;
    opts.onBusyToggle?.(true);
    setState({ ...INITIAL_STATE, phase: 'wallet' });

    try {
      const client = makeWalletClient(opts.account);
      const hash = (await opts.send(client)) as `0x${string}`;
      
      setState((prev) => ({ ...prev, phase: 'submitted', hash }));
      setState((prev) => ({ ...prev, phase: 'consensus', liveStatus: 'PENDING' }));

      // Poll transaction lifecycle under consensus
      const { status, draft } = await pollUntilDecided(client, hash, (liveSt, liveDr) => {
        setState((prev) => ({ ...prev, liveStatus: liveSt, draft: liveDr }));
      });

      if (status === 'ACCEPTED' || status === 'FINALIZED') {
        const tx = await client.getTransaction({ hash } as Parameters<typeof client.getTransaction>[0]).catch(() => null);
        const execResult = tx ? (tx as { txExecutionResult?: unknown }).txExecutionResult : 1;
        if (Number(execResult) === 2) {
          setState((prev) => ({
            ...prev,
            phase: 'error',
            liveStatus: status,
            error: 'The transaction was processed but reverted on-chain. Check that inputs are valid (e.g. Provider and Client addresses must be different).',
          }));
        } else {
          setState((prev) => ({ ...prev, phase: 'confirmed', liveStatus: status, draft }));
          opts.onConfirmed?.(status, draft);
        }
      } else if (status === 'UNDETERMINED') {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          liveStatus: status,
          error: 'The court could not reach a clear consensus verdict. Re-run arbitration to prompt a retry.',
        }));
      } else if (status === 'CANCELED') {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          liveStatus: status,
          error: 'The arbitration transaction was explicitly cancelled on-chain.',
        }));
      } else {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          liveStatus: status,
          error: `Arbitration resolved with abnormal status: ${status}. Check explorer for final state.`,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        error: formatErrorMessage(error),
      }));
    } finally {
      isExecuting.current = false;
      opts.onBusyToggle?.(false);
    }
  }, []);

  return { state, executeTx, resetTx };
}
