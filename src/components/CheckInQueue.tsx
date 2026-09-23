import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { getCheckInStatus, formatFullIST } from '../utils/dateUtils';
import { storageService } from '../services/storageService';
import { Clock, Check } from 'lucide-react';

interface CheckInQueueProps {
  posts: Post[];
  onCheckInCompleted: () => void;
}

export const CheckInQueue: React.FC<CheckInQueueProps> = ({ posts, onCheckInCompleted }) => {
  const [viewInputs, setViewInputs] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [, setTicker] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(t => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const pendingPosts = posts.filter(p => p.views_24h === null);

  if (pendingPosts.length === 0) {
    return (
      <div className="rounded-[8px] bg-card border border-border p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
          <span className="text-muted-foreground">
            No pending check-ins. All logged reels have verified view counts locked.
          </span>
        </div>
        <span className="sec-label">24h Check-in</span>
      </div>
    );
  }

  const handleViewInputChange = (postId: string, val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setViewInputs(prev => ({ ...prev, [postId]: clean }));
  };

  const handleSaveViews = async (postId: string) => {
    const rawVal = viewInputs[postId];
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;

    setSubmittingId(postId);
    await storageService.record24hViews(postId, num);
    setSubmittingId(null);
    onCheckInCompleted();
  };

  const handleSimulate24h = (postId: string) => {
    storageService.simulate24hElapsed(postId);
  };

  return (
    <div className="rounded-[8px] bg-card border border-border p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="sec-label">24-Hour Check-In Queue</span>
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[5px] bg-secondary border border-border text-foreground">
            {pendingPosts.length} pending
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Enter actual view count 24h after publishing
        </span>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {pendingPosts.map(post => {
          const status = getCheckInStatus(post.posted_at);
          const inputValue = viewInputs[post.post_id] || '';

          return (
            <div
              key={post.post_id}
              className={`p-3.5 rounded-[6px] border transition-colors ${
                status.isReady
                  ? 'bg-secondary border-border'
                  : 'bg-card border-border/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {post.caption || 'Untitled Reel'}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-sec-label">
                      {post.slot_source === 'algorithm' ? 'algo' : 'manual'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    {formatFullIST(post.posted_at)}
                  </div>
                </div>

                {status.isReady ? (
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-sec-label px-2 py-0.5 rounded-[5px] bg-primary text-primary-foreground font-medium">
                    Ready
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground px-2 py-0.5 rounded-[5px] bg-secondary border border-border">
                    {status.timeRemainingFormatted}
                  </span>
                )}
              </div>

              {/* Action Area */}
              <div className="mt-3 pt-2.5 border-t border-border">
                {status.isReady ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter 24h views (e.g. 14500)"
                      value={inputValue}
                      onChange={(e) => handleViewInputChange(post.post_id, e.target.value)}
                      className="flex-1 h-[34px] px-3 rounded-[6px] bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:border-ring"
                    />
                    <button
                      onClick={() => handleSaveViews(post.post_id)}
                      disabled={!inputValue || submittingId === post.post_id}
                      className="h-[34px] px-3.5 rounded-[6px] bg-primary text-primary-foreground font-medium text-xs hover:bg-[#e0e0e0] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Lock Views</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono text-[11px] flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      Unlocks in {status.timeRemainingFormatted}
                    </span>

                    {import.meta.env.DEV && (
                      <button
                        onClick={() => handleSimulate24h(post.post_id)}
                        className="font-mono text-[10px] text-muted-foreground hover:text-amber-400 transition underline underline-offset-2"
                        title="Development shortcut: simulate 24 hours elapsed"
                      >
                        [DEV] Fast-forward 24h
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
