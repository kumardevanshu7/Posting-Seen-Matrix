import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { TimeSlotRecommendation, EngineStage, PostType } from '../types';

interface RecommendationHeroProps {
  recommendation: TimeSlotRecommendation;
  totalPosts: number;
  completedPosts: number;
  postType: PostType;
  onUseSlot: (slot: TimeSlotRecommendation) => void;
}

export const RecommendationHero: React.FC<RecommendationHeroProps> = ({
  recommendation,
  totalPosts,
  completedPosts,
  postType,
  onUseSlot,
}) => {
  const getStageEyebrow = (stage: EngineStage) => {
    switch (stage) {
      case 'stage_1_descriptive':
        return 'Stage 01 • Descriptive Analysis';
      case 'stage_2_weighted':
        return 'Stage 02 • Recency-Weighted Scoring';
      case 'stage_3_bandit':
        return 'Stage 03 • Contextual Multi-Armed Bandit';
    }
  };

  const hasData = completedPosts > 0;

  return (
    <div className="rounded-[8px] bg-card border border-border p-6 transition-colors">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Left Information Column */}
        <div className="flex-1 space-y-3">
          
          {/* Eyebrow & Status Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="sec-label">
              {getStageEyebrow(recommendation.stage)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-sec-label">
              Model: {postType}
            </span>
            {recommendation.is_exploration && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-sec-label px-2 py-0.5 rounded-[5px] bg-accent border border-border text-foreground">
                <Compass className="w-3 h-3 text-muted-foreground" />
                Exploration Window
              </span>
            )}
          </div>

          {/* Main Recommended Slot */}
          <div>
            <div className="sec-label text-[10px] mb-1">
              Next Optimal Slot
            </div>

            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tightest text-foreground">
                {recommendation.day_of_week}
              </h2>
              <span className="font-mono text-xl sm:text-2xl font-normal text-muted-foreground">
                {recommendation.suggested_time_ist}
              </span>
            </div>

            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-normal">
              {recommendation.rationale}
            </p>
          </div>

          {/* Metrics Grid: Hairline separated boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-3 rounded-[6px] bg-secondary border border-border">
              <div className="sec-label text-[10px]">Confidence</div>
              <div className="font-mono text-sm font-medium text-foreground mt-1">
                {hasData ? `${recommendation.confidence_score}%` : 'Baseline'}
              </div>
            </div>

            <div className="p-3 rounded-[6px] bg-secondary border border-border">
              <div className="sec-label text-[10px]">Sample Size</div>
              <div className="font-mono text-sm font-medium text-foreground mt-1">
                {recommendation.sample_size}{' '}
                <span className="text-xs text-muted-foreground font-normal">posts</span>
              </div>
            </div>

            <div className="p-3 rounded-[6px] bg-secondary border border-border">
              <div className="sec-label text-[10px]">Median 24h Views</div>
              <div className="font-mono text-sm font-medium text-foreground mt-1">
                {recommendation.expected_median_views > 0
                  ? recommendation.expected_median_views.toLocaleString()
                  : '—'}
              </div>
            </div>

            <div className="p-3 rounded-[6px] bg-secondary border border-border">
              <div className="sec-label text-[10px]">Total History</div>
              <div className="font-mono text-sm font-medium text-foreground mt-1">
                {completedPosts}{' '}
                <span className="text-xs text-muted-foreground font-normal">/ {totalPosts} posts</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right CTA */}
        <div className="w-full lg:w-auto shrink-0 flex flex-col gap-2">
          <button
            onClick={() => onUseSlot(recommendation)}
            className="h-8 px-4 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
          >
            <span>Log Post For This Slot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="text-[11px] font-mono text-muted-foreground text-center">
            Tags as algorithm-suggested
          </div>
        </div>

      </div>
    </div>
  );
};
