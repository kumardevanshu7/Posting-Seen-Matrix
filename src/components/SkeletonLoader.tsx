import React from 'react';

export const RecommendationSkeleton: React.FC = () => {
  return (
    <div className="rounded-[8px] bg-card border border-border p-6 animate-pulse space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-32 bg-secondary rounded-[4px]" />
        <div className="h-3 w-20 bg-secondary rounded-[4px]" />
      </div>

      <div className="space-y-2">
        <div className="h-2 w-28 bg-secondary rounded-[4px]" />
        <div className="flex items-baseline gap-3">
          <div className="h-8 w-44 bg-secondary rounded-[6px]" />
          <div className="h-6 w-36 bg-secondary rounded-[6px]" />
        </div>
        <div className="h-3.5 w-3/4 bg-secondary rounded-[4px]" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-3 rounded-[6px] bg-secondary border border-border space-y-2">
            <div className="h-2 w-16 bg-background rounded-[4px]" />
            <div className="h-4 w-20 bg-background rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TimelineSkeleton: React.FC = () => {
  return (
    <div className="rounded-[8px] bg-card border border-border p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-3 w-32 bg-secondary rounded-[4px]" />
          <div className="h-2.5 w-48 bg-secondary rounded-[4px]" />
        </div>
        <div className="h-8 w-36 bg-secondary rounded-[6px]" />
      </div>

      <div className="divide-y divide-border border-t border-border mt-2 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="pt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[5px] bg-secondary shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-56 bg-secondary rounded-[4px]" />
                <div className="h-2.5 w-36 bg-secondary rounded-[4px]" />
              </div>
            </div>
            <div className="h-4 w-16 bg-secondary rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const MatrixSkeleton: React.FC = () => {
  return (
    <div className="rounded-[8px] bg-card border border-border p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-3 w-32 bg-secondary rounded-[4px]" />
          <div className="h-2.5 w-48 bg-secondary rounded-[4px]" />
        </div>
        <div className="h-3 w-24 bg-secondary rounded-[4px]" />
      </div>

      <div className="space-y-1.5 pt-2">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="grid grid-cols-5 gap-1.5">
            <div className="h-8 bg-secondary rounded-[5px]" />
            <div className="h-8 bg-secondary rounded-[5px]" />
            <div className="h-8 bg-secondary rounded-[5px]" />
            <div className="h-8 bg-secondary rounded-[5px]" />
            <div className="h-8 bg-secondary rounded-[5px]" />
          </div>
        ))}
      </div>
    </div>
  );
};
