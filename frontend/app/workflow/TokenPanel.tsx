"use client";

export interface RecallStat {
  query: string;
  fullTokens: number;
  recallTokens: number;
  nodeCount: number;
}

// The hero visual: how many tokens Corpus saved on the last recall.
export default function TokenPanel({ stat }: { stat: RecallStat | null }) {
  const full = stat?.fullTokens ?? 0;
  const recall = stat?.recallTokens ?? 0;
  const saved = full > 0 ? Math.round((1 - recall / full) * 100) : 0;
  const barPct = full > 0 ? Math.max(2, Math.round((recall / full) * 100)) : 100;

  return (
    <div className="token-panel">
      <div className="token-panel-head">
        <span className="token-panel-label">Token savings</span>
        {stat && <span className="token-panel-saved">{saved}% saved</span>}
      </div>

      {stat ? (
        <>
          <div className="token-query">“{stat.query}”</div>
          <div className="token-row">
            <span className="token-row-label">Full corpus</span>
            <span className="token-row-val token-row-full">{full.toLocaleString()} tok</span>
          </div>
          <div className="token-bar">
            <div className="token-bar-fill" style={{ width: `${barPct}%` }} />
          </div>
          <div className="token-row">
            <span className="token-row-label">Corpus recall</span>
            <span className="token-row-val token-row-recall">
              {recall.toLocaleString()} tok · {stat.nodeCount} nodes
            </span>
          </div>
        </>
      ) : (
        <div className="token-empty">Run a recall to see the savings.</div>
      )}
    </div>
  );
}
