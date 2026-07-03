'use client';

import { useState } from 'react';
import { Shield, ShieldAlert, Award, FileText, Send, User, ChevronRight, HelpCircle, Loader2, Clock } from 'lucide-react';
import { Escrow, EscrowStatus, Verdict } from '@/lib/contract';
import { getRoleForEscrow, getVerdictStyle, shortAddress, STATUS_STYLES } from '@/lib/format';


interface CourtChamberProps {
  escrow: Escrow | null;
  walletAddress: string | null;
  isValidChain: boolean;
  txPhase: string;
  txLiveStatus: string;
  txError: string | null;
  isBusy: boolean;
  onSubmitWork: (deliverable: string) => void;
  onApproveWork: () => void;
  onRaiseDispute: (reason: string) => void;
  onSubmitCounterEvidence: (evidence: string) => void;
  onArbitrate: () => void;
  onConnectWallet: () => void;
}

export function CourtChamber({
  escrow,
  walletAddress,
  isValidChain,
  txPhase,
  txLiveStatus,
  txError,
  isBusy,
  onSubmitWork,
  onApproveWork,
  onRaiseDispute,
  onSubmitCounterEvidence,
  onArbitrate,
  onConnectWallet,
}: CourtChamberProps) {
  const [deliverableInput, setDeliverableInput] = useState('');
  const [disputeInput, setDisputeInput] = useState('');
  const [evidenceInput, setEvidenceInput] = useState('');

  const [activeForm, setActiveForm] = useState<'none' | 'submit' | 'dispute' | 'evidence'>('none');

  if (!escrow) {
    return (
      <div className="court-panel p-8 rounded-lg flex flex-col items-center justify-center text-center bg-[#0d0f13] h-[450px]">
        <div className="p-4 bg-slate-800/20 border border-slate-800/80 rounded-full text-slate-500 mb-4 animate-pulse">
          <Shield className="w-10 h-10" />
        </div>
        <h3 className="font-display font-bold text-base text-slate-300 mb-1">NO CASE SELECT</h3>
        <p className="text-[10px] font-mono text-slate-500 max-w-xs leading-relaxed">
          Select an escrow case from the registry to open the case file workspace.
        </p>
      </div>
    );
  }

  const role = getRoleForEscrow(walletAddress, escrow);
  const style = STATUS_STYLES[escrow.status];
  const isParticipant = role !== 'OBSERVER';

  const isTxProcessing = txPhase === 'wallet' || txPhase === 'submitted' || txPhase === 'consensus';

  const handleActionSubmit = (e: React.FormEvent, type: 'submit' | 'dispute' | 'evidence') => {
    e.preventDefault();
    if (type === 'submit') {
      onSubmitWork(deliverableInput);
      setDeliverableInput('');
    } else if (type === 'dispute') {
      onRaiseDispute(disputeInput);
      setDisputeInput('');
    } else if (type === 'evidence') {
      onSubmitCounterEvidence(evidenceInput);
      setEvidenceInput('');
    }
    setActiveForm('none');
  };

  const getDeadlineDate = (timestamp: number) => {
    try {
      if (timestamp <= 0) return 'None';
      // GenVM timestamps can be stored in seconds, javascript expects milliseconds
      const mult = timestamp < 10000000000 ? 1000 : 1;
      return new Date(timestamp * mult).toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="court-panel p-6 rounded-lg bg-[#0d0f13] space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-3">
        <div>
          <span className="text-[9px] font-mono font-bold text-amber-500 tracking-widest uppercase">
            Arbitration Workspace
          </span>
          <h3 className="font-display font-bold text-lg text-slate-200 tracking-wide mt-0.5">
            {escrow.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 border border-slate-800 px-2 py-0.5 rounded">
            Case #{escrow.id}
          </span>
          <span className={`text-[9px] font-mono px-2 py-0.5 border rounded uppercase ${style.bg} ${style.color}`}>
            {style.label}
          </span>
        </div>
      </div>

      {/* Case Details */}
      <div className="space-y-4 text-xs font-mono">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div className="bg-[#07080a] border border-slate-800 p-2.5 rounded">
              <span className="text-slate-500 block uppercase tracking-wider text-[8px]">Client</span>
              <span className="text-slate-300 font-bold break-all">{escrow.client}</span>
            </div>
            <div className="bg-[#07080a] border border-slate-800 p-2.5 rounded">
              <span className="text-slate-500 block uppercase tracking-wider text-[8px]">Provider</span>
              <span className="text-slate-300 font-bold break-all">{escrow.provider}</span>
            </div>
          </div>

          {/* Agreement Terms */}
          <div className="bg-[#07080a] border border-slate-800 p-4 rounded relative">
            <span className="absolute top-2 right-3 text-[8px] text-slate-600 flex items-center gap-1">
              <FileText className="w-3 h-3" /> TERMS OF AGREEMENT
            </span>
            <p className="text-slate-300 leading-relaxed pt-2 whitespace-pre-wrap">
              {escrow.terms}
            </p>
            <div className="mt-4 border-t border-slate-800/80 pt-2 text-[9px] text-slate-500 flex justify-between">
              <span>Created: {getDeadlineDate(escrow.created_at)}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Deadline: {getDeadlineDate(escrow.deadline)}
              </span>
            </div>
          </div>

          {/* Submitted Deliverable (If Available) */}
          {escrow.deliverable && (
            <div className="bg-blue-950/10 border border-blue-900/30 p-4 rounded relative">
              <span className="absolute top-2 right-3 text-[8px] text-blue-400 font-bold">
                SUBMITTED WORK DELIVERABLE
              </span>
              <p className="text-blue-200 leading-relaxed pt-2 whitespace-pre-wrap">
                {escrow.deliverable}
              </p>
            </div>
          )}

          {/* Dispute Evidences */}
          {escrow.status === 'DISPUTED' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-red-950/10 border border-red-900/20 p-4 rounded relative">
                <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider block mb-1">
                  Client Evidence
                </span>
                <p className="text-red-200/90 leading-relaxed whitespace-pre-wrap">
                  {escrow.client_evidence || '[Waiting for client submission]'}
                </p>
              </div>
              <div className="bg-amber-950/10 border border-amber-900/20 p-4 rounded relative">
                <span className="text-[8px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
                  Provider Evidence
                </span>
                <p className="text-amber-200/90 leading-relaxed whitespace-pre-wrap">
                  {escrow.provider_evidence || '[Waiting for provider submission]'}
                </p>
              </div>
            </div>
          )}
      </div>

      {/* Case Status Summary */}
      <div className="bg-[#07080a] border border-slate-800 rounded-lg p-4 font-mono text-xs">
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-3">
          Case Status
        </span>
        <div className="grid grid-cols-3 gap-4">
          {/* Status */}
          <div className="text-center">
            <span className="text-slate-500 text-[8px] uppercase tracking-wider block mb-1">Status</span>
            <span className={`font-bold text-sm ${
              escrow.status === 'ACTIVE' ? 'text-amber-400' :
              escrow.status === 'DISPUTED' ? 'text-red-400' :
              escrow.status === 'COMPLETED' ? 'text-emerald-400' :
              escrow.status === 'REFUNDED' ? 'text-red-400' :
              'text-slate-300'
            }`}>
              {isTxProcessing ? 'Processing...' : escrow.status}
            </span>
          </div>
          {/* Client Refund */}
          <div className="text-center">
            <span className="text-slate-500 text-[8px] uppercase tracking-wider block mb-1">Client Refund</span>
            <span className="font-bold text-sm text-slate-200">
              {isTxProcessing ? '—' :
                escrow.status === 'COMPLETED' || escrow.resolution.verdict === 'PAYOUT' ? '0%' :
                escrow.status === 'REFUNDED' || escrow.resolution.verdict === 'REFUND' ? '100%' :
                escrow.resolution.verdict === 'SPLIT' ? `${100 - escrow.resolution.provider_percent}%` :
                '—'}
            </span>
          </div>
          {/* Provider Payout */}
          <div className="text-center">
            <span className="text-slate-500 text-[8px] uppercase tracking-wider block mb-1">Provider Payout</span>
            <span className="font-bold text-sm text-slate-200">
              {isTxProcessing ? '—' :
                escrow.status === 'COMPLETED' || escrow.resolution.verdict === 'PAYOUT' ? '100%' :
                escrow.status === 'REFUNDED' || escrow.resolution.verdict === 'REFUND' ? '0%' :
                escrow.resolution.verdict === 'SPLIT' ? `${escrow.resolution.provider_percent}%` :
                '—'}
            </span>
          </div>
        </div>
        {/* Verdict line */}
        {escrow.resolution.verdict && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-center">
            <span className="text-slate-500 text-[8px] uppercase tracking-wider">Verdict: </span>
            <span className={`font-bold text-[11px] uppercase tracking-wider ${
              escrow.resolution.verdict === 'PAYOUT' ? 'text-emerald-400' :
              escrow.resolution.verdict === 'REFUND' ? 'text-red-400' :
              escrow.resolution.verdict === 'SPLIT' ? 'text-amber-400' :
              'text-slate-400'
            }`}>
              {escrow.resolution.verdict}
            </span>
          </div>
        )}
      </div>

      {/* Case Resolution Output Panel */}
      {(escrow.status === 'COMPLETED' || escrow.status === 'REFUNDED' || escrow.status === 'SPLIT') && escrow.resolution.verdict && (
        <div className="border border-emerald-500/25 bg-emerald-500/5 p-5 rounded-lg text-xs font-mono space-y-4">
          <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2 text-emerald-400">
            <Award className="w-5 h-5" />
            <h4 className="font-display font-bold text-sm uppercase tracking-wide">
              {getVerdictStyle(escrow.resolution.verdict).label}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
            <div>
              <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-bold">Court Ruling Synthesis</span>
              <p className="leading-relaxed mt-1 italic">
                &ldquo;{escrow.resolution.proposal}&rdquo;
              </p>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-bold">Judicial Rationale</span>
              <p className="leading-relaxed mt-1">
                {escrow.resolution.reasoning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Action Triggers */}
      <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-4">
        {/* Wallet check */}
        {!walletAddress ? (
          <div className="p-4 border border-slate-800 bg-[#07080a] text-center rounded text-xs font-mono">
            <p className="text-slate-500 mb-2">Connect your wallet to interact with this case file.</p>
            <button
              onClick={onConnectWallet}
              className="haptic-btn px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#07080a] font-bold rounded cursor-pointer text-[10px]"
            >
              CONNECT WALLET
            </button>
          </div>
        ) : !isValidChain ? (
          <div className="p-3 border border-red-500/20 bg-red-500/5 text-red-400 text-center rounded text-[11px] font-mono font-bold">
            🚨 INVALID NETWORK: Switch wallet connection to GenLayer Bradbury Testnet.
          </div>
        ) : (
          /* Participant Actions */
          <div className="text-xs font-mono">
            {/* Live Tx Status tracking */}
            {isTxProcessing && (
              <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                  <div>
                    <h5 className="font-bold text-amber-500">Transaction Deliberating under Consensus</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Validators are compiling models and resolving state hashes. Status: {txLiveStatus}
                    </p>
                  </div>
                </div>
                {txPhase === 'consensus' && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded animate-pulse">
                    VOTING...
                  </span>
                )}
              </div>
            )}

            {txError && (
              <div className="p-3 border border-red-500/20 bg-red-500/5 text-red-400 rounded mb-4">
                <p className="font-bold">Execution Reverted:</p>
                <p className="text-[11px] mt-0.5">{txError}</p>
              </div>
            )}

            {/* Workflow Buttons based on status & role */}
            <div className="flex flex-wrap gap-3">
              {escrow.status === 'ACTIVE' && role === 'PROVIDER' && activeForm !== 'submit' && (
                <button
                  onClick={() => setActiveForm('submit')}
                  disabled={isBusy}
                  className="haptic-btn px-4 py-2 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:bg-blue-400/5 rounded font-bold cursor-pointer"
                >
                  SUBMIT DELIVERABLES
                </button>
              )}

              {escrow.status === 'ACTIVE' && role === 'CLIENT' && activeForm !== 'dispute' && (
                <button
                  onClick={() => setActiveForm('dispute')}
                  disabled={isBusy}
                  className="haptic-btn px-4 py-2 border border-red-500/40 hover:border-red-400 text-red-400 hover:bg-red-500/5 rounded font-bold cursor-pointer"
                >
                  RAISE FORMAL DISPUTE
                </button>
              )}

              {escrow.status === 'SUBMITTED' && role === 'CLIENT' && activeForm === 'none' && (
                <>
                  <button
                    onClick={onApproveWork}
                    disabled={isBusy}
                    className="haptic-btn px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#07080a] border border-emerald-400 rounded font-bold cursor-pointer"
                  >
                    APPROVE WORK & RELEASE FUNDS
                  </button>
                  <button
                    onClick={() => setActiveForm('dispute')}
                    disabled={isBusy}
                    className="haptic-btn px-4 py-2 border border-red-500/40 hover:border-red-400 text-red-400 hover:bg-red-500/5 rounded font-bold cursor-pointer"
                  >
                    DISPUTE DELIVERABLE
                  </button>
                </>
              )}

              {escrow.status === 'DISPUTED' && isParticipant && (
                <>
                  {/* Submit counter evidence option */}
                  {role === 'CLIENT' && !escrow.client_evidence && activeForm !== 'evidence' && (
                    <button
                      onClick={() => setActiveForm('evidence')}
                      disabled={isBusy}
                      className="haptic-btn px-4 py-2 border border-amber-500/40 hover:border-amber-400 text-amber-500 hover:bg-amber-400/5 rounded font-bold cursor-pointer"
                    >
                      SUBMIT RULING EVIDENCE
                    </button>
                  )}
                  {role === 'PROVIDER' && !escrow.provider_evidence && activeForm !== 'evidence' && (
                    <button
                      onClick={() => setActiveForm('evidence')}
                      disabled={isBusy}
                      className="haptic-btn px-4 py-2 border border-amber-500/40 hover:border-amber-400 text-amber-500 hover:bg-amber-400/5 rounded font-bold cursor-pointer"
                    >
                      SUBMIT WORK EVIDENCE
                    </button>
                  )}

                  {/* Convene Arbitrate Court option */}
                  <button
                    onClick={onArbitrate}
                    disabled={isBusy}
                    className="haptic-btn px-5 py-2 bg-amber-500 hover:bg-amber-400 text-[#07080a] border border-amber-400 rounded font-bold cursor-pointer shadow-lg hover:shadow-amber-500/20"
                  >
                    CONVENE TRIBUNAL COURT
                  </button>
                </>
              )}
            </div>

            {/* Render Context Forms inside Workspace */}
            {activeForm === 'submit' && (
              <form onSubmit={(e) => handleActionSubmit(e, 'submit')} className="mt-4 p-4 border border-slate-800 bg-[#07080a] rounded space-y-3">
                <h5 className="font-bold text-blue-400 uppercase tracking-wide text-[10px]">Submit Work Deliverables</h5>
                <textarea
                  required
                  rows={3}
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  placeholder="Provide direct download links, files, text, or documentation verifying completion of terms."
                  className="w-full bg-[#0d0f13] border border-slate-800 focus:border-blue-400/45 rounded p-2 outline-none text-slate-300"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveForm('none')}
                    className="px-3 py-1 border border-slate-800 hover:border-slate-700 text-slate-400 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-blue-500 hover:bg-blue-400 text-[#07080a] font-bold rounded"
                  >
                    Submit Files
                  </button>
                </div>
              </form>
            )}

            {activeForm === 'dispute' && (
              <form onSubmit={(e) => handleActionSubmit(e, 'dispute')} className="mt-4 p-4 border border-slate-800 bg-[#07080a] rounded space-y-3">
                <h5 className="font-bold text-red-400 uppercase tracking-wide text-[10px]">File Formal Dispute Claim</h5>
                <textarea
                  required
                  rows={3}
                  value={disputeInput}
                  onChange={(e) => setDisputeInput(e.target.value)}
                  placeholder="Explain clearly which requirements are missing or done incorrectly. This will be evaluated directly by the AI Arbitrators."
                  className="w-full bg-[#0d0f13] border border-slate-800 focus:border-red-400/45 rounded p-2 outline-none text-slate-300"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveForm('none')}
                    className="px-3 py-1 border border-slate-800 hover:border-slate-700 text-slate-400 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-red-500 hover:bg-red-400 text-[#07080a] font-bold rounded"
                  >
                    Open Dispute Case
                  </button>
                </div>
              </form>
            )}

            {activeForm === 'evidence' && (
              <form onSubmit={(e) => handleActionSubmit(e, 'evidence')} className="mt-4 p-4 border border-slate-800 bg-[#07080a] rounded space-y-3">
                <h5 className="font-bold text-amber-500 uppercase tracking-wide text-[10px]">Submit Case Evidence</h5>
                <textarea
                  required
                  rows={3}
                  value={evidenceInput}
                  onChange={(e) => setEvidenceInput(e.target.value)}
                  placeholder="Provide supporting explanations, communications, or backup deliverables to validate your position."
                  className="w-full bg-[#0d0f13] border border-slate-800 focus:border-amber-500/45 rounded p-2 outline-none text-slate-300"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveForm('none')}
                    className="px-3 py-1 border border-slate-800 hover:border-slate-700 text-slate-400 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-amber-500 hover:bg-amber-400 text-[#07080a] font-bold rounded"
                  >
                    Submit Evidence
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
