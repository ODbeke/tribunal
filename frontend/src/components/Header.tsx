'use client';

import { Power, Wallet } from 'lucide-react';
import { WalletHook } from '@/hooks/useWallet';
import { CourtStats } from '@/lib/contract';
import { shortAddress } from '@/lib/format';

interface HeaderProps {
  wallet: WalletHook;
  stats: CourtStats;
  onCreateClick: () => void;
}

export function Header({ wallet, stats, onCreateClick }: HeaderProps) {
  return (
    <header className="court-border border-b bg-[#090a0d]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex flex-col">
          <h1 className="font-display font-bold text-lg tracking-wide">
            TRIBUNAL
          </h1>
          <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mt-0.5">
            Decentralized AI Escrow Court
          </p>
        </div>

        {/* Global Statistics Counters */}
        <div className="flex items-center gap-6 bg-[#0d0f13] border border-slate-800 rounded-lg px-4 py-2 text-xs font-mono">
          <div className="text-center">
            <span className="block text-slate-400 font-bold">{stats.total_escrows}</span>
            <span className="text-[9px] text-slate-600 uppercase">Total Cases</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div className="text-center">
            <span className="block text-amber-500 font-bold">{stats.active_disputes}</span>
            <span className="text-[9px] text-slate-600 uppercase">Active Disputes</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div className="text-center">
            <span className="block text-emerald-400 font-bold">{stats.resolved_disputes}</span>
            <span className="text-[9px] text-slate-600 uppercase">Resolved</span>
          </div>
        </div>

        {/* Action Controls & Wallet Connection */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCreateClick}
            className="haptic-btn px-4 py-2 text-xs font-mono font-bold bg-amber-500 text-[#07080a] border border-amber-400 rounded-md hover:bg-amber-400 cursor-pointer shadow-lg hover:shadow-amber-500/20"
          >
            + CREATE ESCROW
          </button>

          {wallet.account ? (
            <div className="flex items-center gap-2 bg-[#0d0f13] border border-slate-800 rounded-md p-1.5 pl-3 text-xs font-mono">
              <div className="text-right">
                <span className="block text-[10px] text-slate-400">
                  {shortAddress(wallet.account)}
                </span>
                <span className="block text-[9px] text-amber-500 font-bold">
                  {wallet.balanceGEN ?? '0.00'} GEN
                </span>
              </div>
              <button
                onClick={wallet.disconnectWallet}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/5 transition-colors cursor-pointer"
                title="Disconnect Wallet"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={wallet.connectWallet}
              disabled={wallet.isConnecting}
              className="haptic-btn flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold bg-[#0d0f13] border border-slate-800 hover:border-amber-500/40 text-slate-300 rounded-md transition-colors cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-amber-500" />
              {wallet.isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
