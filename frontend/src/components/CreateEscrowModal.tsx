'use client';

import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { LIMITS } from '@/lib/contract';

interface CreateEscrowModalProps {
  isOpen: boolean;
  isBusy: boolean;
  onClose: () => void;
  onSubmit: (provider: string, title: string, terms: string, amountGen: string, deadlineHours: number) => void;
  clientAddress?: string;
}

export function CreateEscrowModal({ isOpen, isBusy, onClose, onSubmit, clientAddress }: CreateEscrowModalProps) {
  const [provider, setProvider] = useState('');
  const [title, setTitle] = useState('');
  const [terms, setTerms] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [deadlineHours, setDeadlineHours] = useState(24);

  const [validationErr, setValidationErr] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErr(null);

    // Validate provider address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(provider.trim())) {
      setValidationErr('Provider address must be a valid 42-character hex address starting with 0x.');
      return;
    }

    // Validate provider is not client
    if (clientAddress && provider.trim().toLowerCase() === clientAddress.toLowerCase()) {
      setValidationErr('Provider address cannot be the same as your connected wallet address. Please use a different address to act as the provider.');
      return;
    }

    // Validate string lengths
    if (title.length < LIMITS.title.min || title.length > LIMITS.title.max) {
      setValidationErr(`Title must be between ${LIMITS.title.min} and ${LIMITS.title.max} characters.`);
      return;
    }

    if (terms.length < LIMITS.terms.min || terms.length > LIMITS.terms.max) {
      setValidationErr(`Terms must be between ${LIMITS.terms.min} and ${LIMITS.terms.max} characters.`);
      return;
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationErr('Please enter a positive numeric GEN amount to lock in escrow.');
      return;
    }

    // Validate deadline
    if (deadlineHours < 1) {
      setValidationErr('Deadline must be at least 1 hour in the future.');
      return;
    }

    onSubmit(provider.trim(), title.trim(), terms.trim(), amount, deadlineHours);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="court-panel w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto scanline-overlay">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Shield className="w-5 h-5" />
            <h3 className="font-display font-bold text-lg tracking-wide">FOUND NEW ESCROW</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
              Provider Wallet Address (0x)
            </label>
            <input
              type="text"
              required
              disabled={isBusy}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#07080a] border border-slate-800 focus:border-amber-500/50 rounded p-2.5 outline-none text-slate-300"
            />
            {clientAddress && provider.trim().toLowerCase() === clientAddress.toLowerCase() && (
              <span className="text-[10px] text-red-400 block mt-1 tracking-wide">
                ⚠️ Provider cannot be the same as your connected client address.
              </span>
            )}
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
              Agreement Title
            </label>
            <input
              type="text"
              required
              disabled={isBusy}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Logo Design, Website MVP Development"
              className="w-full bg-[#07080a] border border-slate-800 focus:border-amber-500/50 rounded p-2.5 outline-none text-slate-300"
            />
            <span className="text-[10px] text-slate-600 block mt-0.5 text-right">
              {title.length}/{LIMITS.title.max} chars
            </span>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
              Detailed Agreement Terms & Conditions
            </label>
            <textarea
              required
              rows={4}
              disabled={isBusy}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Clearly write down what requirements the provider must meet to claim this escrow. This text will be reviewed directly by the AI Judges if a dispute arises."
              className="w-full bg-[#07080a] border border-slate-800 focus:border-amber-500/50 rounded p-2.5 outline-none text-slate-300 resize-none"
            />
            <span className="text-[10px] text-slate-600 block mt-0.5 text-right">
              {terms.length}/{LIMITS.terms.max} chars
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                Lock Amount (GEN)
              </label>
              <input
                type="number"
                step="0.0001"
                required
                disabled={isBusy}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                className="w-full bg-[#07080a] border border-slate-800 focus:border-amber-500/50 rounded p-2.5 outline-none text-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                Deadline (Hours)
              </label>
              <input
                type="number"
                required
                min={1}
                disabled={isBusy}
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(parseInt(e.target.value) || 24)}
                placeholder="24"
                className="w-full bg-[#07080a] border border-slate-800 focus:border-amber-500/50 rounded p-2.5 outline-none text-slate-300"
              />
            </div>
          </div>

          {validationErr && (
            <div className="p-3 border border-red-500/20 bg-red-500/5 text-red-400 text-[11px] rounded">
              {validationErr}
            </div>
          )}

          <div className="border-t border-slate-800 pt-4 flex gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={onClose}
              className="w-1/2 px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 rounded font-bold cursor-pointer transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="w-1/2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#07080a] border border-amber-400 rounded font-bold cursor-pointer transition-colors shadow-lg hover:shadow-amber-500/10"
            >
              {isBusy ? 'FUNDING...' : 'DEPOSIT & START'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
