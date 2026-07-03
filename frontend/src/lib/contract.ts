import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

// Tribunal Smart Contract Address on GenLayer Bradbury Testnet.
// This will be replaced with the user's deployed contract address.
export const CONTRACT_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;

export const EXPLORER = 'https://explorer-bradbury.genlayer.com';
export const FAUCET = 'https://testnet-faucet.genlayer.foundation/';

export const readClient = createClient({ chain: testnetBradbury });

export const makeWalletClient = (account: `0x${string}`) =>
  createClient({ chain: testnetBradbury, account });

export type WalletClient = ReturnType<typeof makeWalletClient>;

const ADDRESS = CONTRACT_ADDRESS as `0x${string}`;

// ---- contract character & length constraints ---------------------------

export const LIMITS = {
  title: { min: 5, max: 100 },
  terms: { min: 20, max: 1000 },
  evidence: { min: 10, max: 800 },
} as const;

// ---- contract state types ------------------------------------------------

export type EscrowStatus = 'ACTIVE' | 'SUBMITTED' | 'DISPUTED' | 'COMPLETED' | 'REFUNDED' | 'SPLIT';
export type Verdict = 'PAYOUT' | 'REFUND' | 'SPLIT' | '';

export interface Resolution {
  verdict: Verdict;
  provider_percent: number;
  reasoning: string;
  proposal: string;
}

export interface Escrow {
  id: string;
  client: string;
  provider: string;
  title: string;
  terms: string;
  amount: string; // stored as string due to u256 serialization
  status: EscrowStatus;
  deliverable: string;
  client_evidence: string;
  provider_evidence: string;
  dispute_reason: string;
  resolution: Resolution;
  created_at: number;
  deadline: number;
  disputed_at: number;
  resolved_at: number;
}

export interface CourtStats {
  total_escrows: number;
  active_disputes: number;
  resolved_disputes: number;
}

// ---- RPC resilient helper --------------------------------------------------

export async function withRpcRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!/rate limit|429|timeout|network|fetch|too many/i.test(String(e))) throw e;
      // Exponential backoff: 2.5s, 5s, 10s, 20s
      await new Promise((resolve) => setTimeout(resolve, 2500 * 2 ** i));
    }
  }
  throw lastError;
}

// ---- state normalization utilities -----------------------------------------

function toRecord<T>(value: unknown): T {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) obj[String(k)] = normalize(v);
    return obj as T;
  }
  return value as T;
}

function normalize(value: unknown): unknown {
  if (value instanceof Map) return toRecord(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return String(v ?? '');
}

function parseResolution(raw: unknown): Resolution {
  const r = toRecord<Record<string, unknown>>(raw);
  if (!r || Object.keys(r).length === 0) {
    return { verdict: '', provider_percent: 0, reasoning: '', proposal: '' };
  }
  return {
    verdict: (str(r.verdict).toUpperCase() as Verdict) || '',
    provider_percent: num(r.provider_percent),
    reasoning: str(r.reasoning),
    proposal: str(r.proposal),
  };
}

function asEscrow(raw: unknown): Escrow {
  const r = toRecord<Record<string, unknown>>(raw);
  return {
    id: str(r.id),
    client: str(r.client),
    provider: str(r.provider),
    title: str(r.title),
    terms: str(r.terms),
    amount: str(r.amount),
    status: (str(r.status).toUpperCase() as EscrowStatus) || 'ACTIVE',
    deliverable: str(r.deliverable),
    client_evidence: str(r.client_evidence),
    provider_evidence: str(r.provider_evidence),
    dispute_reason: str(r.dispute_reason),
    resolution: parseResolution(normalize(r.resolution)),
    created_at: num(r.created_at),
    deadline: num(r.deadline),
    disputed_at: num(r.disputed_at),
    resolved_at: num(r.resolved_at),
  };
}

// ---- contract view functions -----------------------------------------------

export async function fetchEscrows(start = 0, limit = 10): Promise<Escrow[]> {
  const raw = await withRpcRetry(() =>
    readClient.readContract({
      address: ADDRESS,
      functionName: 'get_escrows',
      args: [start, limit],
    }),
  );
  const arr = (normalize(raw) as unknown[]) ?? [];
  return arr.map(asEscrow);
}

export async function fetchEscrow(id: string): Promise<Escrow> {
  const raw = await withRpcRetry(() =>
    readClient.readContract({
      address: ADDRESS,
      functionName: 'get_escrow',
      args: [id],
    }),
  );
  return asEscrow(normalize(raw));
}

export async function fetchCourtStats(): Promise<CourtStats> {
  const raw = await withRpcRetry(() =>
    readClient.readContract({
      address: ADDRESS,
      functionName: 'get_global_stats',
      args: [],
    }),
  );
  const r = toRecord<Record<string, unknown>>(normalize(raw));
  return {
    total_escrows: num(r.total_escrows),
    active_disputes: num(r.active_disputes),
    resolved_disputes: num(r.resolved_disputes),
  };
}

// ---- contract write functions (signed transactions) -------------------------

export function createEscrowTx(
  client: WalletClient,
  provider: string,
  title: string,
  terms: string,
  deadlineTimestamp: number,
  clientTimestamp: number,
  valueWei: bigint,
) {
  return client.writeContract({
    address: ADDRESS,
    functionName: 'create_escrow',
    args: [provider, title, terms, deadlineTimestamp, clientTimestamp],
    value: valueWei,
  });
}

export function submitWorkTx(client: WalletClient, escrowId: string, deliverable: string) {
  return client.writeContract({
    address: ADDRESS,
    functionName: 'submit_work',
    args: [escrowId, deliverable],
    value: 0n,
  });
}

export function approveWorkTx(client: WalletClient, escrowId: string) {
  return client.writeContract({
    address: ADDRESS,
    functionName: 'approve_work',
    args: [escrowId],
    value: 0n,
  });
}

export function raiseDisputeTx(
  client: WalletClient,
  escrowId: string,
  reason: string,
  clientTimestamp: number,
) {
  return client.writeContract({
    address: ADDRESS,
    functionName: 'raise_dispute',
    args: [escrowId, reason, clientTimestamp],
    value: 0n,
  });
}

export function submitCounterEvidenceTx(client: WalletClient, escrowId: string, evidence: string) {
  return client.writeContract({
    address: ADDRESS,
    functionName: 'submit_counter_evidence',
    args: [escrowId, evidence],
    value: 0n,
  });
}

export function arbitrateDisputeTx(client: WalletClient, escrowId: string, clientTimestamp: number) {
  return client.writeContract({
    address: ADDRESS,
    functionName: 'arbitrate_dispute',
    args: [escrowId, clientTimestamp],
    value: 0n,
  });
}

// ---- transaction status polling --------------------------------------------

const STATUS_NAME: Record<string, string> = {
  '1': 'PENDING',
  '2': 'PROPOSING',
  '3': 'COMMITTING',
  '4': 'REVEALING',
  '5': 'ACCEPTED',
  '6': 'UNDETERMINED',
  '7': 'FINALIZED',
  '8': 'CANCELED',
  '12': 'VALIDATORS_TIMEOUT',
  '13': 'LEADER_TIMEOUT',
};

export const statusName = (s: unknown): string =>
  STATUS_NAME[String(s)] ?? String(s ?? 'PENDING').toUpperCase();

const TERMINAL_STATUSES = new Set(['ACCEPTED', 'FINALIZED', 'UNDETERMINED', 'CANCELED']);

export interface ArbitratorDraft {
  verdict: Verdict;
  provider_percent: number;
  reasoning?: string;
  proposal?: string;
}

function pick(obj: unknown, key: string): unknown {
  if (obj instanceof Map) return obj.get(key);
  if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
  return undefined;
}

export function extractArbitratorDraft(tx: unknown): ArbitratorDraft | null {
  try {
    const receipts = pick(pick(tx, 'consensus_data'), 'leader_receipt');
    const first = Array.isArray(receipts) ? receipts[0] : receipts;
    const b64 = pick(pick(first, 'eq_outputs'), '0');
    if (typeof b64 !== 'string' || b64.length === 0) return null;
    const text = atob(b64);
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] !== '{') continue;
      try {
        const obj = JSON.parse(text.slice(i)) as Record<string, unknown>;
        if (obj && typeof obj === 'object' && 'verdict' in obj) {
          return {
            verdict: (str(obj.verdict).toUpperCase() as Verdict) || '',
            provider_percent: num(obj.provider_percent),
            reasoning: obj.reasoning !== undefined ? str(obj.reasoning) : undefined,
            proposal: obj.proposal !== undefined ? str(obj.proposal) : undefined,
          };
        }
      } catch {
        // continue scanning backward for a valid JSON boundary
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function pollUntilDecided(
  client: WalletClient,
  hash: `0x${string}`,
  onUpdate?: (status: string, draft: ArbitratorDraft | null) => void,
): Promise<{ status: string; draft: ArbitratorDraft | null }> {
  let draft: ArbitratorDraft | null = null;
  for (let i = 0; i < 150; i++) {
    const tx = await client
      .getTransaction({ hash } as Parameters<typeof client.getTransaction>[0])
      .catch(() => null);
    const status = statusName(tx ? (tx as { status?: unknown }).status : 'PENDING');
    draft = extractArbitratorDraft(tx) ?? draft;
    onUpdate?.(status, draft);
    if (TERMINAL_STATUSES.has(status)) return { status, draft };
    await new Promise((r) => setTimeout(r, 8000));
  }
  return { status: 'TIMEOUT', draft };
}
