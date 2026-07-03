import { EscrowStatus, Verdict, Escrow } from './contract';

export function shortAddress(addr: string | null | undefined, size = 4): string {
  if (!addr) return '';
  const cleanAddr = String(addr).trim();
  if (cleanAddr.length <= size * 2 + 2) return cleanAddr;
  return `${cleanAddr.slice(0, size + 2)}...${cleanAddr.slice(-size)}`;
}

export function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export type EscrowRole = 'CLIENT' | 'PROVIDER' | 'OBSERVER';

export function getRoleForEscrow(walletAddress: string | null | undefined, escrow: Escrow): EscrowRole {
  if (!walletAddress) return 'OBSERVER';
  if (sameAddress(walletAddress, escrow.client)) return 'CLIENT';
  if (sameAddress(walletAddress, escrow.provider)) return 'PROVIDER';
  return 'OBSERVER';
}

export interface StatusStyle {
  color: string;
  bg: string;
  label: string;
}

export const STATUS_STYLES: Record<EscrowStatus, StatusStyle> = {
  ACTIVE: {
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    label: 'Escrow Active',
  },
  SUBMITTED: {
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    label: 'Work Submitted',
  },
  DISPUTED: {
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    label: 'Arbitration Case Open',
  },
  COMPLETED: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    label: 'Paid to Provider',
  },
  REFUNDED: {
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500/20',
    label: 'Refunded to Client',
  },
  SPLIT: {
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
    label: 'Escrow Split Payout',
  },
};

export function getVerdictStyle(v: Verdict): { color: string; label: string } {
  switch (v) {
    case 'PAYOUT':
      return { color: 'text-emerald-400', label: 'PAYOUT APPROVED (100% to Provider)' };
    case 'REFUND':
      return { color: 'text-red-400', label: 'REFUND APPROVED (100% to Client)' };
    case 'SPLIT':
      return { color: 'text-purple-400', label: 'SPLIT PAYOUT RULING' };
    default:
      return { color: 'text-slate-400', label: 'Pending Case Resolution' };
  }
}

export function formatBalance(weiStr: string | null | undefined): string {
  if (!weiStr) return '0.00';
  try {
    const rawVal = BigInt(weiStr);
    const whole = rawVal / 10n ** 18n;
    const remainder = rawVal % 10n ** 18n;
    let fraction = remainder.toString().padStart(18, '0').slice(0, 4);
    fraction = fraction.replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole.toString();
  } catch {
    return '0.00';
  }
}
