'use client';

import { useState } from 'react';
import { Briefcase, AlertTriangle, ShieldCheck, Clock, Archive } from 'lucide-react';
import { Escrow, EscrowStatus } from '@/lib/contract';
import { formatBalance, shortAddress, STATUS_STYLES } from '@/lib/format';

interface EscrowBoardProps {
  escrows: Escrow[];
  selectedId: string | null;
  walletAddress: string | null;
  onSelect: (escrow: Escrow) => void;
}

type FilterStatus = 'ALL' | 'ACTIVE' | 'DISPUTED' | 'RESOLVED';

export function EscrowBoard({ escrows, selectedId, walletAddress, onSelect }: EscrowBoardProps) {
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  const filteredEscrows = escrows.filter((escrow) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return escrow.status === 'ACTIVE' || escrow.status === 'SUBMITTED';
    if (filter === 'DISPUTED') return escrow.status === 'DISPUTED';
    if (filter === 'RESOLVED') return escrow.status === 'COMPLETED' || escrow.status === 'REFUNDED' || escrow.status === 'SPLIT';
    return true;
  });

  const getStatusIcon = (status: EscrowStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'SUBMITTED':
        return <Briefcase className="w-4 h-4 text-blue-400" />;
      case 'DISPUTED':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'COMPLETED':
      case 'REFUNDED':
      case 'SPLIT':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Archive className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-300">
          Escrow Agreements Registry
        </h3>
        <div className="flex gap-1.5 text-[10px] font-mono">
          {(['ALL', 'ACTIVE', 'DISPUTED', 'RESOLVED'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 border transition-colors cursor-pointer rounded ${
                filter === f
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                  : 'bg-[#0d0f13] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEscrows.length === 0 ? (
          <div className="court-panel p-8 text-center text-xs font-mono text-slate-500 md:col-span-2">
            No matching escrow cases found in the local cache.
          </div>
        ) : (
          filteredEscrows.map((escrow) => {
            const isSelected = escrow.id === selectedId;
            const style = STATUS_STYLES[escrow.status];
            
            // Check if user is participant
            const isUserClient = walletAddress && escrow.client.toLowerCase() === walletAddress.toLowerCase();
            const isUserProvider = walletAddress && escrow.provider.toLowerCase() === walletAddress.toLowerCase();
            const isParticipant = isUserClient || isUserProvider;

            return (
              <div
                key={escrow.id}
                onClick={() => onSelect(escrow)}
                className={`court-panel p-5 rounded-lg flex flex-col justify-between gap-4 cursor-pointer hover:border-amber-500/35 transition-all ${
                  isSelected ? 'border-amber-500 shadow-md shadow-amber-500/5 bg-[#12151b]' : 'bg-[#0d0f13]'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                      #{escrow.id}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 border rounded uppercase ${style.bg} ${style.color}`}
                    >
                      {style.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className="font-display font-bold text-sm text-slate-200 tracking-wide mb-1 leading-snug">
                    {escrow.title}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 line-clamp-2 leading-relaxed">
                    {escrow.terms}
                  </p>
                </div>

                {/* Card Footer Details */}
                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex gap-3 text-slate-500">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-600">Client</span>
                      <span>{shortAddress(escrow.client)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-600">Provider</span>
                      <span>{shortAddress(escrow.provider)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-wider text-slate-600">Locked Funds</span>
                    <span className="font-bold text-amber-500 text-xs">
                      {formatBalance(escrow.amount)} GEN
                    </span>
                  </div>
                </div>

                {/* Badge if connected wallet is participant */}
                {isParticipant && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-[#07080a] text-[8px] font-mono font-bold px-2 py-0.5 rounded border border-amber-400 uppercase tracking-widest shadow">
                    {isUserClient ? 'YOUR DEPOSIT' : 'YOUR CONTRACT'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
