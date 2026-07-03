'use client';

import { motion } from 'framer-motion';
import { EscrowStatus, Verdict } from '@/lib/contract';

export interface CourtScaleProps {
  status: EscrowStatus;
  verdict: Verdict;
  providerPercent: number;
  isProcessing: boolean;
  className?: string;
}

export function CourtScale({
  status,
  verdict,
  providerPercent,
  isProcessing,
  className,
}: CourtScaleProps) {
  // Compute the angle of the balance beam
  // Negative tilts to client (left), positive tilts to provider (right)
  let angle = 0;
  
  if (isProcessing) {
    // We will apply a continuous keyframe wobble in framer-motion if processing
    angle = 0;
  } else if (status === 'DISPUTED') {
    angle = 0; // balanced while case is open
  } else if (status === 'COMPLETED' || verdict === 'PAYOUT') {
    angle = 20; // heavily tilted to provider
  } else if (status === 'REFUNDED' || verdict === 'REFUND') {
    angle = -20; // heavily tilted to client
  } else if (status === 'SPLIT' || verdict === 'SPLIT') {
    // Interpolate angle: 0% provider = -20deg, 100% provider = 20deg
    const pct = providerPercent || 50;
    angle = -20 + (pct / 100) * 40;
  }

  // Beam coordinates: pivots at (50, 30)
  // Left pivot points at (20, 30), Right pivot points at (80, 30) before rotation
  const pivotX = 50;
  const pivotY = 32;
  const halfLength = 32;

  // We let framer-motion handle the rotation of the beam.
  // The hanging plates need to translate vertically so they stay upright as the beam tilts.
  // Left plate hanging point offset: dy = Math.sin(angle_rad) * halfLength, dx = (1 - Math.cos(angle_rad)) * halfLength
  const angleRad = (angle * Math.PI) / 180;
  const deltaY = Math.sin(angleRad) * halfLength;

  return (
    <div className={`flex flex-col items-stretch justify-center px-0 py-4 w-full ${className}`}>
      <svg
        viewBox="0 0 100 80"
        className="w-full max-w-[280px] h-auto mx-auto drop-shadow-[0_0_15px_rgba(245,158,11,0.08)]"
        aria-label="Court Scales of Justice"
      >
        {/* Core stand (Judicial Pillar) */}
        <path
          d="M48 32 h4 v32 h-4 z M43 64 h14 v3 h-14 z M46 67 h8 v2 h-8 z"
          fill="#1E293B"
          stroke="rgba(245,158,11,0.2)"
          strokeWidth="0.5"
        />
        {/* Stand pivot head */}
        <circle cx={pivotX} cy={pivotY} r="3" fill="var(--amber)" className="amber-glow-text" />

        {/* Rotating Balance Beam */}
        <motion.g
          animate={
            isProcessing
              ? { rotate: [-10, 10, -10] }
              : { rotate: angle }
          }
          transition={
            isProcessing
              ? { repeat: Infinity, duration: 3, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 50, damping: 12 }
          }
          style={{ originX: `${pivotX}%`, originY: `${pivotY}%` }}
        >
          {/* Main beam crossbar */}
          <line
            x1={pivotX - halfLength}
            y1={pivotY}
            x2={pivotX + halfLength}
            y2={pivotY}
            stroke="var(--amber)"
            strokeWidth="1.8"
          />
          {/* Decorative balance beam detailing */}
          <line
            x1={pivotX - halfLength}
            y1={pivotY - 2}
            x2={pivotX + halfLength}
            y2={pivotY - 2}
            stroke="rgba(245,158,11,0.4)"
            strokeWidth="0.6"
          />
          
          {/* Left hanging hook */}
          <circle cx={pivotX - halfLength} cy={pivotY} r="1.5" fill="var(--amber)" />
          {/* Right hanging hook */}
          <circle cx={pivotX + halfLength} cy={pivotY} r="1.5" fill="var(--amber)" />
        </motion.g>

        {/* Left Hanging Scale Plate (Client) */}
        <motion.g
          animate={{
            y: isProcessing ? undefined : deltaY,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 12 }}
        >
          {/* Strings */}
          <line x1={pivotX - halfLength} y1={pivotY} x2={pivotX - halfLength - 5} y2={pivotY + 22} stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" />
          <line x1={pivotX - halfLength} y1={pivotY} x2={pivotX - halfLength + 5} y2={pivotY + 22} stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" />
          {/* Plate */}
          <path
            d={`M${pivotX - halfLength - 8} ${pivotY + 22} h16 c0 4-4 6-8 6s-8-2-8-6 z`}
            fill={verdict === 'REFUND' || status === 'REFUNDED' ? 'var(--crimson)' : 'rgba(30, 41, 59, 0.9)'}
            stroke={verdict === 'REFUND' || status === 'REFUNDED' ? 'var(--crimson)' : 'var(--amber)'}
            strokeWidth="0.8"
          />
        </motion.g>

        {/* Right Hanging Scale Plate (Provider) */}
        <motion.g
          animate={{
            y: isProcessing ? undefined : -deltaY,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 12 }}
        >
          {/* Strings */}
          <line x1={pivotX + halfLength} y1={pivotY} x2={pivotX + halfLength - 5} y2={pivotY + 22} stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" />
          <line x1={pivotX + halfLength} y1={pivotY} x2={pivotX + halfLength + 5} y2={pivotY + 22} stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" />
          {/* Plate */}
          <path
            d={`M${pivotX + halfLength - 8} ${pivotY + 22} h16 c0 4-4 6-8 6s-8-2-8-6 z`}
            fill={verdict === 'PAYOUT' || status === 'COMPLETED' ? 'var(--emerald)' : 'rgba(30, 41, 59, 0.9)'}
            stroke={verdict === 'PAYOUT' || status === 'COMPLETED' ? 'var(--emerald)' : 'var(--amber)'}
            strokeWidth="0.8"
          />
        </motion.g>
      </svg>

      {/* Scale verdict labels */}
      <div className="flex justify-between items-start w-full mt-3 font-mono select-none px-1 gap-2">
        {/* Refund (Left) */}
        <div className="text-center min-w-0">
          <span className="block font-bold text-slate-200 text-sm leading-tight">
            {isProcessing ? '??' : status === 'COMPLETED' || verdict === 'PAYOUT' ? '0%' : status === 'REFUNDED' || verdict === 'REFUND' ? '100%' : `${100 - providerPercent}%`}
          </span>
          <span className="text-[9px] text-slate-500 block uppercase tracking-widest mt-0.5">Refund</span>
        </div>

        {/* Status (Center) */}
        <div className="text-center min-w-0">
          <span className="text-base block leading-none">
            {isProcessing ? '⏳' : status === 'DISPUTED' ? '⚖️' : '📜'}
          </span>
          <span className="text-amber-500 font-bold text-[9px] uppercase tracking-widest block mt-1 whitespace-nowrap">
            {isProcessing ? 'Deliberating' : status === 'DISPUTED' ? 'Active' : 'Ruled'}
          </span>
        </div>

        {/* Payout (Right) */}
        <div className="text-center min-w-0">
          <span className="block font-bold text-slate-200 text-sm leading-tight">
            {isProcessing ? '??' : status === 'COMPLETED' || verdict === 'PAYOUT' ? '100%' : status === 'REFUNDED' || verdict === 'REFUND' ? '0%' : `${providerPercent}%`}
          </span>
          <span className="text-[9px] text-slate-500 block uppercase tracking-widest mt-0.5">Payout</span>
        </div>
      </div>
    </div>
  );
}
