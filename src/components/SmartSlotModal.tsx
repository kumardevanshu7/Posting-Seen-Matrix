import React, { useState, useEffect } from 'react';
import { X, Clock, ArrowRight, AlertCircle, Zap, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Post, PostType } from '../types';
import { generateDailySlotPlan, SmartSlot, SmartSlotPlan } from '../services/slotDistributionEngine';
import { formatTimeIST } from '../utils/dateUtils';

interface SmartSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  initialPostType?: PostType;
  onSelectSlot: (slot: SmartSlot, postType: PostType) => void;
}

export const SmartSlotModal: React.FC<SmartSlotModalProps> = ({
  isOpen,
  onClose,
  posts,
  initialPostType = 'public',
  onSelectSlot,
}) => {
  const [selectedType, setSelectedType] = useState<PostType>(initialPostType);
  const [count, setCount] = useState<number>(4);
  const [currentIST, setCurrentIST] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [plan, setPlan] = useState<SmartSlotPlan | null>(null);

  // Live IST Clock
  useEffect(() => {
    const update = () => {
      setCurrentIST(formatTimeIST(new Date()));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute plan on open or when parameters change
  const runAnalysis = (type: PostType, reelCount: number) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const generated = generateDailySlotPlan({
        postType: type,
        count: reelCount,
        posts,
      });
      setPlan(generated);
      setIsAnalyzing(false);
    }, 550);
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedType(initialPostType);
      runAnalysis(initialPostType, count);
    }
  }, [isOpen]);

  const handleTypeChange = (type: PostType) => {
    setSelectedType(type);
    runAnalysis(type, count);
  };

  const handleCountChange = (newCount: number) => {
    setCount(newCount);
    runAnalysis(selectedType, newCount);
  };

  if (!isOpen) return null;

  const getTierBadge = (tier: SmartSlot['qualityTier'], score: number) => {
    switch (tier) {
      case 'peak':
        return (
          <span className="font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Peak Window • {score}%
          </span>
        );
      case 'prime':
        return (
          <span className="font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[4px] bg-foreground text-background font-semibold">
            Prime • {score}%
          </span>
        );
      case 'good':
        return (
          <span className="font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[4px] bg-secondary border border-border text-foreground">
            Solid Slot • {score}%
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[4px] bg-secondary border border-border text-muted-foreground">
            Active • {score}%
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-[10px] bg-card border border-border shadow-2xl p-5 sm:p-7 space-y-5 my-auto transition-all">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-secondary border border-border text-[10px] font-mono uppercase tracking-sec-label text-foreground">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Smart Posting Scheduler</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tightest text-foreground">
              Plan Remaining-Day Slots
            </h2>
            <p className="text-xs text-muted-foreground">
              Intelligently distributes reels strictly after current time across today's peak engagement windows.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live IST Anchor Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[6px] bg-secondary/60 border border-border font-mono text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-foreground" />
            <span>Current IST Anchor:</span>
            <span className="text-foreground font-semibold px-1.5 py-0.5 rounded bg-background border border-border">
              {currentIST}
            </span>
          </div>

          <button
            onClick={() => runAnalysis(selectedType, count)}
            disabled={isAnalyzing}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono transition-colors cursor-pointer disabled:opacity-50"
            title="Recalculate slots from this exact second"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3 h-3 text-amber-400" />
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'Recalculate Now'}</span>
          </button>
        </div>

        {/* Strategy Selection: Option A (Trial) vs Option B (Public) */}
        <div className="space-y-1.5">
          <label className="sec-label text-[10px] block">
            Step 1 • Select Strategy & Buffer
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            
            {/* Option A: Trial */}
            <button
              type="button"
              onClick={() => handleTypeChange('trial')}
              className={`p-3 rounded-[8px] border text-left transition-all cursor-pointer ${
                selectedType === 'trial'
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs uppercase tracking-wider font-mono">
                  Option A • Trial Reels
                </span>
                <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.2 rounded bg-background/20">
                  50m buffer
                </span>
              </div>
              <p className="text-[11px] leading-snug opacity-90">
                Optimized for testing multiple hooks, rapid audience feedback, and micro-variations.
              </p>
            </button>

            {/* Option B: Public */}
            <button
              type="button"
              onClick={() => handleTypeChange('public')}
              className={`p-3 rounded-[8px] border text-left transition-all cursor-pointer ${
                selectedType === 'public'
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs uppercase tracking-wider font-mono">
                  Option B • Trial to Public
                </span>
                <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.2 rounded bg-background/20">
                  80m buffer
                </span>
              </div>
              <p className="text-[11px] leading-snug opacity-90">
                Optimized for maximum organic retention, algorithm shelf-life, and prime audience peaks.
              </p>
            </button>

          </div>
        </div>

        {/* Quantity Selector: 1 to 6 reels */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="sec-label text-[10px] block">
              Step 2 • How many reels do you want to post today?
            </label>
            <span className="font-mono text-[10px] text-muted-foreground">
              Select 1 to 6
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleCountChange(num)}
                className={`h-9 rounded-[6px] font-mono text-xs font-medium border transition-all cursor-pointer ${
                  count === num
                    ? 'bg-foreground text-background border-foreground font-semibold shadow-none'
                    : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input'
                }`}
              >
                {num} {num === 1 ? 'Reel' : 'Reels'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State or Results */}
        {isAnalyzing ? (
          <div className="p-8 rounded-[8px] border border-border bg-secondary/20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <div className="text-center space-y-1">
              <div className="font-mono text-xs text-foreground font-medium">
                Analyzing audience engagement curves from {currentIST}...
              </div>
              <div className="text-[11px] text-muted-foreground">
                Partitioning remainder day with {selectedType === 'trial' ? '50m' : '80m'} anti-cannibalization spacing
              </div>
            </div>
          </div>
        ) : plan ? (
          <div className="space-y-3">
            
            {/* Executive Briefing Banner */}
            <div className="p-3 rounded-[6px] bg-secondary/80 border border-border text-xs text-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Optimal Schedule Generated</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {plan.executiveSummary}
              </p>
            </div>

            {/* Spillover Warning Alert if applicable */}
            {plan.hasSpillover && plan.spilloverMessage && (
              <div className="p-3 rounded-[6px] bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="leading-relaxed">
                  <span className="font-semibold">Late-Hour Schedule Adjustment: </span>
                  {plan.spilloverMessage}
                </div>
              </div>
            )}

            {/* Generated Slots List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="sec-label text-[10px]">
                  Allocated Schedule ({plan.slots.length} Windows)
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Chronological Order
                </span>
              </div>

              <div className="divide-y divide-border border border-border rounded-[8px] overflow-hidden bg-background">
                {plan.slots.map((slot, idx) => (
                  <div
                    key={slot.slot_id}
                    className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                  >
                    {/* Left: Slot details */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-[5px] bg-secondary border border-border flex items-center justify-center font-mono text-xs font-semibold text-foreground shrink-0 mt-0.5">
                        #{idx + 1}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {slot.timeIST}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-secondary border border-border text-muted-foreground">
                            {slot.dateLabel}
                          </span>
                          {getTierBadge(slot.qualityTier, slot.qualityScore)}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{slot.windowContext}:</span>
                          <span className="truncate">{slot.rationale}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Direct Action Button */}
                    <button
                      onClick={() => onSelectSlot(slot, selectedType)}
                      className="w-full sm:w-auto h-8 px-3 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <span>Post for this slot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : null}

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border pt-3">
          <span>* Spacing buffer enforced between all consecutive slots</span>
          <span>Aligned with Indian viewer activity peaks</span>
        </div>

      </div>
    </div>
  );
};
