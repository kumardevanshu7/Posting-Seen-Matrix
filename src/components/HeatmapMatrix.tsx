import React, { useState } from 'react';
import { DayStats, TimeBucket } from '../types';
import { TIME_BUCKET_CONFIG } from '../utils/dateUtils';

interface HeatmapMatrixProps {
  dayStats: DayStats[];
}

const BUCKET_ORDER: TimeBucket[] = ['morning', 'afternoon', 'evening', 'night'];

export const HeatmapMatrix: React.FC<HeatmapMatrixProps> = ({ dayStats }) => {
  const [selectedSlot, setSelectedSlot] = useState<{ dayName: string; bucket: TimeBucket; stats: any } | null>(null);

  let maxMedian = 0;
  dayStats.forEach(d => {
    BUCKET_ORDER.forEach(b => {
      const med = d.buckets[b]?.medianViews || 0;
      if (med > maxMedian) maxMedian = med;
    });
  });

  // Grayscale tonal ramp (Executor design system)
  const getCellTone = (median: number, count: number) => {
    if (count === 0) return 'bg-[#0a0a0a] border-border text-[#404040] hover:border-input';
    if (maxMedian === 0) return 'bg-secondary border-border text-foreground';

    const ratio = median / maxMedian;
    if (ratio >= 0.8) return 'bg-[#2a2a2a] border-[#444444] text-foreground font-semibold';
    if (ratio >= 0.5) return 'bg-[#202020] border-[#333333] text-foreground';
    if (ratio >= 0.25) return 'bg-[#181818] border-border text-foreground/90';
    return 'bg-secondary border-border text-muted-foreground';
  };

  return (
    <div className="rounded-[8px] bg-card border border-border p-5 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="sec-label">Performance Heatmap</span>
            <span className="font-mono text-[11px] text-muted-foreground">Day × Time-Bucket</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Median 24h view distribution mapped to Indian Standard Time
          </p>
        </div>

        {/* Grayscale Legend */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span>0</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#0a0a0a] border border-border" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#181818] border border-border" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#202020] border border-[#333333]" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#2a2a2a] border border-[#444444]" />
          </div>
          <span>Max</span>
        </div>
      </div>

      {/* Grid container */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[560px]">
          
          {/* Header row: Time buckets */}
          <div className="grid grid-cols-5 gap-1.5 mb-1.5">
            <div className="p-2 sec-label text-[10px]">Day</div>
            {BUCKET_ORDER.map(b => (
              <div key={b} className="p-2 rounded-[5px] bg-secondary border border-border sec-label text-[10px] text-center">
                {TIME_BUCKET_CONFIG[b].label}
              </div>
            ))}
          </div>

          {/* Rows: Days of week */}
          <div className="space-y-1.5">
            {dayStats.map(d => (
              <div key={d.dayName} className="grid grid-cols-5 gap-1.5 items-center">
                {/* Day label */}
                <div className="p-2 rounded-[5px] font-mono text-xs font-medium text-foreground flex items-center justify-between">
                  <span>{d.dayName.slice(0, 3)}</span>
                  {d.totalCompletedPosts > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {d.totalCompletedPosts}p
                    </span>
                  )}
                </div>

                {/* 4 Buckets */}
                {BUCKET_ORDER.map(b => {
                  const bStat = d.buckets[b];
                  const hasData = bStat && bStat.completedCount > 0;
                  const cellTone = getCellTone(bStat?.medianViews || 0, bStat?.completedCount || 0);

                  return (
                    <button
                      key={b}
                      onClick={() => setSelectedSlot({ dayName: d.dayName, bucket: b, stats: bStat })}
                      className={`p-2 rounded-[5px] border text-left transition-all ${cellTone}`}
                    >
                      {hasData ? (
                        <div className="flex items-baseline justify-between font-mono">
                          <span className="text-xs">
                            {bStat.medianViews >= 1000
                              ? `${(bStat.medianViews / 1000).toFixed(1)}k`
                              : bStat.medianViews}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{bStat.completedCount}p</span>
                        </div>
                      ) : (
                        <div className="text-center font-mono text-[10px] text-[#333333]">
                          —
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Selected slot detail bar */}
      {selectedSlot && (
        <div className="p-3 rounded-[6px] bg-secondary border border-border flex items-center justify-between gap-4 text-xs">
          <div className="font-mono">
            <span className="text-foreground font-semibold">
              {selectedSlot.dayName} {TIME_BUCKET_CONFIG[selectedSlot.bucket].label}
            </span>
            <span className="text-muted-foreground ml-2">
              ({TIME_BUCKET_CONFIG[selectedSlot.bucket].range})
            </span>
            <span className="text-muted-foreground ml-3">
              {selectedSlot.stats.completedCount > 0 ? (
                <span>
                  Median: <strong className="text-foreground">{selectedSlot.stats.medianViews.toLocaleString()}</strong> • 
                  Mean: <strong className="text-foreground">{selectedSlot.stats.meanViews.toLocaleString()}</strong> • 
                  Sample: <strong className="text-foreground">{selectedSlot.stats.completedCount}</strong> verified
                </span>
              ) : (
                <span>No verified posts in this slot</span>
              )}
            </span>
          </div>
          <button
            onClick={() => setSelectedSlot(null)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

    </div>
  );
};
