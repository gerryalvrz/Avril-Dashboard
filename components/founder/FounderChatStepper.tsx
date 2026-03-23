'use client';

import { computeFieldProgress, computeThreeQuestionStep } from '@/src/modules/avril/founderChatProgress';

type Props = {
  phase?: string | null;
  /** Optional 1–3 from model JSON for reliable UI. */
  questionIndex?: number | null;
  captured?: Record<string, unknown> | null;
  draftStatus?: 'collecting' | 'ready' | 'spawned' | null;
  className?: string;
};

export function FounderChatStepper({
  phase,
  questionIndex,
  captured,
  draftStatus,
  className = '',
}: Props) {
  const fp = computeFieldProgress(captured ?? undefined);
  const tq = computeThreeQuestionStep(phase ?? undefined, questionIndex);
  const pct = fp.total > 0 ? Math.round((fp.filledCount / fp.total) * 100) : 0;
  const qBarPct = tq.handoffReady ? 100 : Math.round((tq.displayStep / 3) * 100);

  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs space-y-2 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-white/90">Founder wizard (3 questions)</span>
        <span className="text-[10px] text-white/50">
          {tq.handoffReady ? (
            <span className="text-emerald-300">3/3 done · {tq.label}</span>
          ) : (
            <>
              Q{tq.displayStep}/{tq.total}: <span className="text-violet-200">{tq.label}</span>
            </>
          )}
          {draftStatus === 'ready' ? (
            <span className="ml-2 text-emerald-300">· Draft ready</span>
          ) : draftStatus === 'spawned' ? (
            <span className="ml-2 text-blue-300">· Spawned</span>
          ) : null}
        </span>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-white/45 mb-1">
          <span>Questions progress</span>
          <span>{tq.handoffReady ? '100%' : `${qBarPct}%`}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300"
            style={{ width: `${qBarPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/45 mb-1">
          <span>Control plane fields (AI fills after Q3)</span>
          <span>
            {fp.filledCount}/{fp.total} ({pct}%)
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {!tq.handoffReady ? (
        <p className="text-[11px] text-amber-100/90">
          Avril will ask exactly <span className="font-medium text-white">three</span> focused questions tied to the founder control plane, then infer the rest.
        </p>
      ) : fp.nextFieldLabel ? (
        <p className="text-[11px] text-amber-100/90">
          Still filling: <span className="font-medium text-white">{fp.nextFieldLabel}</span> — reply or tap “Fill Home” to sync.
        </p>
      ) : (
        <p className="text-[11px] text-emerald-200/90">All control plane keys populated — ready for handoff / spawn.</p>
      )}
    </div>
  );
}
