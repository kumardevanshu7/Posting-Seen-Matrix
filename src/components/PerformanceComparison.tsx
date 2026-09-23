import React from 'react';
import { ComparisonReport } from '../types';

interface PerformanceComparisonProps {
  report: ComparisonReport;
}

export const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({ report }) => {
  const { algorithm, user, edgePercentage } = report;
  const hasEnoughData = algorithm.completedPosts >= 2 && user.completedPosts >= 2;

  return (
    <div className="rounded-[8px] bg-card border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="sec-label">Algorithm vs. User Choice</span>
            <span className="font-mono text-[11px] text-muted-foreground">ROI Analysis</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluating performance edge of following recommendations vs manual timing
          </p>
        </div>

        {hasEnoughData ? (
          <div className="px-2.5 py-1 rounded-[5px] bg-secondary border border-border font-mono text-xs text-foreground flex items-center gap-1.5">
            <span>
              {edgePercentage > 0
                ? `Algorithm +${edgePercentage}% higher median`
                : edgePercentage < 0
                ? `Manual +${Math.abs(edgePercentage)}% higher median`
                : 'Performance equivalent'}
            </span>
          </div>
        ) : (
          <div className="font-mono text-[11px] text-muted-foreground">
            Awaiting 2+ verified posts per group
          </div>
        )}
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Algorithm-Suggested */}
        <div className="p-3.5 rounded-[6px] bg-secondary border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Algorithm Slots</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {algorithm.completedPosts} verified / {algorithm.totalPosts} total
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            <div>
              <div className="sec-label text-[10px]">Median Views</div>
              <div className="font-mono text-sm font-semibold text-foreground mt-0.5">
                {algorithm.medianViews > 0 ? algorithm.medianViews.toLocaleString() : '—'}
              </div>
            </div>
            <div>
              <div className="sec-label text-[10px]">Mean Views</div>
              <div className="font-mono text-sm text-muted-foreground mt-0.5">
                {algorithm.meanViews > 0 ? algorithm.meanViews.toLocaleString() : '—'}
              </div>
            </div>
            <div>
              <div className="sec-label text-[10px]">Top Post</div>
              <div className="font-mono text-sm text-foreground mt-0.5">
                {algorithm.topPostViews > 0 ? algorithm.topPostViews.toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* User-Chosen */}
        <div className="p-3.5 rounded-[6px] bg-secondary border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Manual Slots</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {user.completedPosts} verified / {user.totalPosts} total
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            <div>
              <div className="sec-label text-[10px]">Median Views</div>
              <div className="font-mono text-sm font-semibold text-foreground mt-0.5">
                {user.medianViews > 0 ? user.medianViews.toLocaleString() : '—'}
              </div>
            </div>
            <div>
              <div className="sec-label text-[10px]">Mean Views</div>
              <div className="font-mono text-sm text-muted-foreground mt-0.5">
                {user.meanViews > 0 ? user.meanViews.toLocaleString() : '—'}
              </div>
            </div>
            <div>
              <div className="sec-label text-[10px]">Top Post</div>
              <div className="font-mono text-sm text-foreground mt-0.5">
                {user.topPostViews > 0 ? user.topPostViews.toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
