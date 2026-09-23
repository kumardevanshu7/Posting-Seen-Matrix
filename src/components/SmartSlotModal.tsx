import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Clock, ArrowRight, AlertCircle, Calendar, Zap } from 'lucide-react';
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
  const [count, setCount] = useState<number>(3);
  const [currentIST, setCurrentIST] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedType(initialPostType);
    }
  }, [isOpen, initialPostType]);

  useEffect(() => {
    const update = () => {
      setCurrentIST(formatTimeIST(new Date().toISOString()));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute smart slot distribution
  const plan: SmartSlotPlan = useMemo(() => {
    return generateDailySlotPlan({
      postType: selectedType,
      count,
      posts,
    });
  }, [selectedType, count, posts]);

  if (!isOpen) return null;

  const getTierBadge = (tier: SmartSlot['qualityTier']) => {
    switch (tier) {
      case 'peak':
        return (
          <span className="font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
            Peak Window
          </span>
        );
      case 'prime':
        return (
          <span className="font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[4px] bg-foreground text-background font-semibold">
            Prime Slot
          </span>
        );
      case 'good':
        return (
          <span className="font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[4px] bg-secondary border border-border text-foreground">
            Good Slot
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[4px] bg-secondary border border-border text-muted-foreground">
            Fallback
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-[10px] bg-card border border-border shadow-2xl p-5 sm:p-7 space-y-6 my-auto">
        
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
              Calculates your highest-retention schedule from current time forward, respecting anti-cannibalization buffers.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live IST Clock */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[6px] bg-secondary/60 border border-border font-mono text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-foreground" />
            <span>Current IST Anchor:</span>
            <span className="text-foreground font-semibold">{currentIST}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            All suggested slots are strictly after this time
          </span>
        </div>

        {/* Option Selection: Trial vs Public */}
        <div className="space-y-1.5">
          <label className="sec-label text-[10px] block">
            Select Strategy & Reel Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            
            {/* Option A: Trial */}
            <button
              type="button"
              onClick={() => setSelectedType('trial')}
              className={`p-3 rounded-[8px] border text-left transition-all ${
                selectedType === 'trial'
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs uppercase tracking-wider font-mono">
                  Option A • Trial Reels
                </span>
                <span className="text-[10px] font-mono opacity-80">50m buffer</span>
              </div>
              <p className="text-[11px] leading-snug opacity-90">
                Optimized for testing multiple hooks, rapid feedback, and active viewer probing.
              </p>
            </button>

            {/* Option B: Public */}
            <button
              type="button"
              onClick={() => setSelectedType('public')}
              className={`p-3 rounded-[8px] border text-left transition-all ${
                selectedType === 'public'
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs uppercase tracking-wider font-mono">
                  Option B • Trial to Public
                </span>
                <span className="text-[10px] font-mono opacity-80">80m buffer</span>
              </div>
              <p className="text-[11px] leading-snug opacity-90">
                Optimized for maximum organic reach, algorithmic shelf-life, and prime audience peaks.
              </p>
            </button>

          </div>
        </div>

        {/* Quantity Selector: 1 to 6 reels */}
        <div className="space-y-1.5">
          <label className="sec-label text-[10px] block">
            How many reels do you want to post today?
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setCount(num)}
                className={`h-9 rounded-[6px] font-mono text-xs font-medium border transition-all ${
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="sec-label text-[10px]">
              Recommended Schedule ({plan.slots.length} Slots Allocated)
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Ordered Chronologically
            </span>
          </div>

          <div className="divide-y divide-border border border-border rounded-[8px] overflow-hidden bg-background">
            {plan.slots.map((slot, idx) => (
              <div
                key={slot.slot_id}
                className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-secondary/40 transition-colors"
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
                      {getTierBadge(slot.qualityTier)}
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {slot.rationale}
                    </p>
                  </div>
                </div>

                {/* Right: Direct Action Button */}
                <button
                  onClick={() => onSelectSlot(slot, selectedType)}
                  className="w-full sm:w-auto h-8 px-3 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                >
                  <span>Post for this slot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border pt-3">
          <span>* Minimum spacing enforced between slots</span>
          <span>Quality scores weighted by IST audience activity</span>
        </div>

      </div>
    </div>
  );
};
