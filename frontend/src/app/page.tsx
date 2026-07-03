'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useCourtData, useEscrowDetails } from '@/hooks/useContractData';
import { useTransaction } from '@/hooks/useTransaction';
import { createEscrowTx, approveWorkTx, raiseDisputeTx, submitCounterEvidenceTx, submitWorkTx, arbitrateDisputeTx, Escrow } from '@/lib/contract';
import { Header } from '@/components/Header';
import { EscrowBoard } from '@/components/EscrowBoard';
import { CourtChamber } from '@/components/CourtChamber';
import { CreateEscrowModal } from '@/components/CreateEscrowModal';
import { ToastProvider, useToast } from '@/components/Toast';
import { Shield, Scale, Info, ExternalLink } from 'lucide-react';

function PageContent() {
  const wallet = useWallet();
  const court = useCourtData();
  const toasts = useToast();
  
  const createEscrowTxState = useTransaction();
  const escrowActionsTxState = useTransaction();

  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const isFreshSelect = useRef(false);

  const selectedDetails = useEscrowDetails(selectedEscrow?.id ?? '', selectedEscrow ?? undefined);

  // Sync detailed changes back to the main list and local selected state
  useEffect(() => {
    if (selectedDetails.escrow) {
      setSelectedEscrow(selectedDetails.escrow);
    }
  }, [selectedDetails.escrow]);

  // Keep list synchronized when actions happen
  const refreshLedger = useCallback(async () => {
    await Promise.all([court.refresh(), selectedDetails.refresh()]);
  }, [court, selectedDetails]);

  // Form submission: Create Escrow
  const handleCreateSubmit = useCallback((
    provider: string,
    title: string,
    terms: string,
    amountGen: string,
    deadlineHours: number
  ) => {
    if (!wallet.account) {
      toasts.pushToast({ kind: 'error', title: 'Wallet not connected' });
      return;
    }

    const toastId = toasts.pushToast({
      kind: 'loading',
      title: 'Depositing Escrow Funds',
      message: 'Signing deposit transaction in your wallet...',
    });

    const valWei = BigInt(Math.round(parseFloat(amountGen) * 1e18));
    const nowSec = Math.floor(Date.now() / 1000);
    const deadlineSec = nowSec + deadlineHours * 3600;

    createEscrowTxState.executeTx({
      account: wallet.account,
      send: (client) => createEscrowTx(
        client,
        provider,
        title,
        terms,
        deadlineSec,
        nowSec,
        valWei
      ),
      onBusyToggle: court.setBusy,
      onConfirmed: (status, draft) => {
        toasts.updateToast(toastId, {
          kind: 'success',
          title: 'Escrow Successfully Funded',
          message: 'Funds locked. Provider is now authorized to submit work deliverables.',
          hash: createEscrowTxState.state.hash ?? undefined,
        });
        setIsCreateOpen(false);
        wallet.updateBalance();
        refreshLedger();
      },
    });
  }, [wallet, toasts, createEscrowTxState, court, refreshLedger]);

  // Surface create errors as persistent toasts
  const lastCreateErr = useRef<string | null>(null);
  useEffect(() => {
    if (
      createEscrowTxState.state.phase === 'error' &&
      createEscrowTxState.state.error &&
      createEscrowTxState.state.error !== lastCreateErr.current
    ) {
      lastCreateErr.current = createEscrowTxState.state.error;
      toasts.pushToast({
        kind: 'error',
        title: 'Escrow Creation Failed',
        message: createEscrowTxState.state.error,
      });
    }
    if (createEscrowTxState.state.phase !== 'error') lastCreateErr.current = null;
  }, [createEscrowTxState.state.phase, createEscrowTxState.state.error, toasts]);

  // Action submission: Submit Work
  const handleSubmitWork = useCallback((deliverable: string) => {
    if (!wallet.account || !selectedEscrow) return;
    const toastId = toasts.pushToast({
      kind: 'loading',
      title: 'Submitting Deliverable',
      message: 'Broadcasting work link to GenLayer ledger...',
    });

    escrowActionsTxState.executeTx({
      account: wallet.account,
      send: (client) => submitWorkTx(client, selectedEscrow.id, deliverable),
      onBusyToggle: selectedDetails.setBusy,
      onConfirmed: () => {
        toasts.updateToast(toastId, {
          kind: 'success',
          title: 'Deliverable Submitted',
          message: 'Client has been notified to review and approve.',
          hash: escrowActionsTxState.state.hash ?? undefined,
        });
        refreshLedger();
      },
    });
  }, [wallet, selectedEscrow, toasts, escrowActionsTxState, selectedDetails, refreshLedger]);

  // Action submission: Approve Work
  const handleApproveWork = useCallback(() => {
    if (!wallet.account || !selectedEscrow) return;
    const toastId = toasts.pushToast({
      kind: 'loading',
      title: 'Releasing Escrow Payout',
      message: 'Authorizing complete payout to contractor...',
    });

    escrowActionsTxState.executeTx({
      account: wallet.account,
      send: (client) => approveWorkTx(client, selectedEscrow.id),
      onBusyToggle: selectedDetails.setBusy,
      onConfirmed: () => {
        toasts.updateToast(toastId, {
          kind: 'success',
          title: 'Escrow Completed',
          message: 'Escrow payout initiated. Fund delivery to the provider completes upon finalization (~30 min).',
          hash: escrowActionsTxState.state.hash ?? undefined,
        });
        wallet.updateBalance();
        refreshLedger();
      },
    });
  }, [wallet, selectedEscrow, toasts, escrowActionsTxState, selectedDetails, refreshLedger]);

  // Action submission: Raise Dispute
  const handleRaiseDispute = useCallback((reason: string) => {
    if (!wallet.account || !selectedEscrow) return;
    const toastId = toasts.pushToast({
      kind: 'loading',
      title: 'Opening Dispute Case',
      message: 'Filing claim. Escrow is locked for arbitration...',
    });

    const nowSec = Math.floor(Date.now() / 1000);

    escrowActionsTxState.executeTx({
      account: wallet.account,
      send: (client) => raiseDisputeTx(client, selectedEscrow.id, reason, nowSec),
      onBusyToggle: selectedDetails.setBusy,
      onConfirmed: () => {
        toasts.updateToast(toastId, {
          kind: 'success',
          title: 'Dispute Registered',
          message: 'Evidence is locked. Court is preparing for arbitration.',
          hash: escrowActionsTxState.state.hash ?? undefined,
        });
        refreshLedger();
      },
    });
  }, [wallet, selectedEscrow, toasts, escrowActionsTxState, selectedDetails, refreshLedger]);

  // Action submission: Submit Counter-Evidence
  const handleSubmitCounterEvidence = useCallback((evidence: string) => {
    if (!wallet.account || !selectedEscrow) return;
    const toastId = toasts.pushToast({
      kind: 'loading',
      title: 'Submitting Case Evidence',
      message: 'Locking counter-arguments into dispute file...',
    });

    escrowActionsTxState.executeTx({
      account: wallet.account,
      send: (client) => submitCounterEvidenceTx(client, selectedEscrow.id, evidence),
      onBusyToggle: selectedDetails.setBusy,
      onConfirmed: () => {
        toasts.updateToast(toastId, {
          kind: 'success',
          title: 'Evidence Recorded',
          message: 'Your evidence will be analyzed during court arbitration.',
          hash: escrowActionsTxState.state.hash ?? undefined,
        });
        refreshLedger();
      },
    });
  }, [wallet, selectedEscrow, toasts, escrowActionsTxState, selectedDetails, refreshLedger]);

  // Action submission: Convene Arbitrate
  const handleArbitrate = useCallback(() => {
    if (!wallet.account || !selectedEscrow) return;
    const toastId = toasts.pushToast({
      kind: 'loading',
      title: 'Convening AI Tribunal',
      message: 'Running dispute analysis under GenLayer consensus validators. This can take up to 2 minutes...',
    });

    const nowSec = Math.floor(Date.now() / 1000);

    escrowActionsTxState.executeTx({
      account: wallet.account,
      send: (client) => arbitrateDisputeTx(client, selectedEscrow.id, nowSec),
      onBusyToggle: selectedDetails.setBusy,
      onConfirmed: (status, draft) => {
        toasts.updateToast(toastId, {
          kind: 'success',
          title: 'Court Verdict Finalized',
          message: `Escrow split initiated based on verdict: ${draft?.verdict}. Fund delivery completes upon finalization (~30 min).`,
          hash: escrowActionsTxState.state.hash ?? undefined,
        });
        wallet.updateBalance();
        refreshLedger();
      },
    });
  }, [wallet, selectedEscrow, toasts, escrowActionsTxState, selectedDetails, refreshLedger]);

  // Scroll to workspace on mobile when escrow selected
  const handleEscrowSelect = useCallback((escrow: Escrow) => {
    setSelectedEscrow(escrow);
    setTimeout(() => {
      const el = document.getElementById('workspace');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const createBusy =
    createEscrowTxState.state.phase === 'wallet' ||
    createEscrowTxState.state.phase === 'submitted' ||
    createEscrowTxState.state.phase === 'consensus';

  return (
    <div className="flex-1 flex flex-col min-h-full pb-12">
      {/* Top Navigation */}
      <Header
        wallet={wallet}
        stats={court.stats}
        onCreateClick={() => {
          if (!wallet.account) {
            wallet.connectWallet();
          } else {
            setIsCreateOpen(true);
          }
        }}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8 flex-1 items-start">
        {/* Info panel + registry lists (Left 3 columns) */}
        <div className="lg:col-span-3 space-y-8">
          {/* Welcome Banner */}
          <section className="court-panel p-6 rounded-lg bg-[#0d0f13] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 scanline-overlay">
            <div className="space-y-1 max-w-lg">
              <div className="text-amber-500">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
                  Validator Consensus Arbitrator
                </span>
              </div>
              <h2 className="font-display font-bold text-xl text-slate-100 tracking-wide">
                GenLayer Decisive Arbitration ESCROW
              </h2>
              <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
                Secure agreements with smart contract locked funds. If expectations mismatch, either party can file a dispute claim. Consensus AI Arbitrators evaluate deliverables against terms and automatically execute splits.
              </p>
            </div>
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center">
              <Scale className="w-8 h-8" />
            </div>
          </section>

          {/* Escrows List */}
          <section>
            <EscrowBoard
              escrows={court.escrows}
              selectedId={selectedEscrow?.id ?? null}
              walletAddress={wallet.account}
              onSelect={handleEscrowSelect}
            />
          </section>

          {/* Helpful Tips Section */}
          <section className="p-4 border border-slate-800 bg-[#0d0f13]/40 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
            <div className="text-[10px] font-mono text-slate-500 space-y-1">
              <h5 className="font-bold text-slate-400">GenLayer Arbitration Operational Guidelines</h5>
              <p className="leading-relaxed">
                To try the escrow, deposit test GEN. If terms are violated, open a dispute. Running arbitration uses heavy model prompts. The execution will take a moment as validators reach cryptographic equivalence consensus on the verdict.
              </p>
              <div className="flex gap-4 pt-1">
                <a
                  href="https://testnet-faucet.genlayer.foundation/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-500/80 hover:text-amber-500 flex items-center gap-1 hover:underline"
                >
                  Faucet <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://explorer-bradbury.genlayer.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-500/80 hover:text-amber-500 flex items-center gap-1 hover:underline"
                >
                  Bradbury Explorer <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Case File Workspace (Right 2 columns) */}
        <div id="workspace" className="lg:col-span-2 sticky top-24">
          <CourtChamber
            escrow={selectedEscrow}
            walletAddress={wallet.account}
            isValidChain={wallet.isValidChain}
            txPhase={escrowActionsTxState.state.phase}
            txLiveStatus={escrowActionsTxState.state.liveStatus}
            txError={escrowActionsTxState.state.error}
            isBusy={selectedDetails.loading || court.busy}
            onSubmitWork={handleSubmitWork}
            onApproveWork={handleApproveWork}
            onRaiseDispute={handleRaiseDispute}
            onSubmitCounterEvidence={handleSubmitCounterEvidence}
            onArbitrate={handleArbitrate}
            onConnectWallet={wallet.connectWallet}
          />
        </div>
      </main>

      {/* Popups & Modals */}
      <CreateEscrowModal
        isOpen={isCreateOpen}
        isBusy={createBusy}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        clientAddress={wallet.account ?? undefined}
      />
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <PageContent />
    </ToastProvider>
  );
}
