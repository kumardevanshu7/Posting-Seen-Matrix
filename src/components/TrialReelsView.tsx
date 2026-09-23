import React, { useState } from 'react';
import { Post, UserProfile } from '../types';
import { formatTimeIST, formatDateIST, getTimeBucket, TIME_BUCKET_CONFIG } from '../utils/dateUtils';
import {
  Search, Trash2, Calendar, List, Eye, Globe, ArrowLeft, FlaskConical,
} from 'lucide-react';
import { SetPublicModal } from './SetPublicModal';

interface TrialReelsViewProps {
  trialPosts: Post[];
  userProfile: UserProfile | null;
  onBack: () => void;
  onRequestDeletePost: (post: Post) => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export const TrialReelsView: React.FC<TrialReelsViewProps> = ({
  trialPosts,
  userProfile,
  onBack,
  onRequestDeletePost,
  onOpenSettings,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFormat, setViewFormat] = useState<'date_grouped' | 'flat'>('date_grouped');
  const [setPublicTarget, setSetPublicTarget] = useState<Post | null>(null);

  const filteredPosts = trialPosts.filter(p => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.caption && p.caption.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  // Group by IST Date
  const groupedByDate: Record<string, { dateLabel: string; posts: Post[]; totalViews: number }> = {};
  filteredPosts.forEach(post => {
    const dateLabel = formatDateIST(post.posted_at, true);
    if (!groupedByDate[dateLabel]) {
      groupedByDate[dateLabel] = { dateLabel, posts: [], totalViews: 0 };
    }
    groupedByDate[dateLabel].posts.push(post);
    if (post.views_24h) {
      groupedByDate[dateLabel].totalViews += post.views_24h;
    }
  });

  const dateKeys = Object.keys(groupedByDate);

  // Shared reel row renderer
  const renderReelRow = (post: Post, compact = false) => {
    const bucket = getTimeBucket(post.posted_at);

    return (
      <div
        key={post.post_id}
        className={`${compact ? 'py-3 px-2' : 'py-3 px-3.5'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-accent/40 transition-colors`}
      >
        {/* Left: Thumbnail & Details */}
        <div className="flex items-start gap-3 min-w-0">
          {post.media_ref ? (
            <img
              src={post.media_ref}
              alt="Thumbnail"
              className="w-11 h-11 rounded-[5px] object-cover border border-border shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-[5px] bg-secondary border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0">
              reel
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                {post.title || post.caption || 'Untitled Reel'}
              </h4>
              <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-secondary border border-border text-muted-foreground shrink-0">
                {post.slot_source === 'algorithm' ? 'algo' : 'manual'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground mt-0.5">
              <span className="text-foreground font-medium">{formatTimeIST(post.posted_at)}</span>
              <span>•</span>
              <span className="capitalize">{TIME_BUCKET_CONFIG[bucket].label} Bucket</span>
              {compact && (
                <>
                  <span>•</span>
                  <span>{formatDateIST(post.posted_at, false)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">

          {/* Set Public Record button */}
          <button
            onClick={() => setSetPublicTarget(post)}
            className="h-7 px-2.5 rounded-[5px] border border-emerald-600/40 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 hover:border-emerald-500/60 font-mono text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Set as Public Record"
          >
            <Globe className="w-3 h-3" />
            <span>Set Public Record</span>
          </button>

          {/* Delete button */}
          <button
            onClick={() => onRequestDeletePost(post)}
            className="p-1.5 rounded-[4px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Remove post"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Page Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30 backdrop-blur-md bg-card/95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-[5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
                  Trial Reels Board
                </span>
                <span className="font-mono text-[11px] text-muted-foreground px-1.5 py-0.5 rounded-[4px] bg-secondary border border-border">
                  {trialPosts.length} reels
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Promote trial reels to public — 24h timer starts on confirmation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="rounded-[8px] bg-card border border-border p-5 space-y-4">

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="sec-label">Date-Wise Trial Log</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {filteredPosts.length} reels
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a reel and set it as Public Record to start your 24h tracking window
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search title / hook..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-36 sm:w-44 h-8 pl-8 pr-2.5 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring font-mono"
                />
              </div>

              {/* View Toggle */}
              <div className="flex rounded-[6px] bg-secondary border border-border p-0.5 text-xs">
                <button
                  onClick={() => setViewFormat('date_grouped')}
                  className={`p-1.5 rounded-[5px] transition-colors ${
                    viewFormat === 'date_grouped' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Group by Date"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewFormat('flat')}
                  className={`p-1.5 rounded-[5px] transition-colors ${
                    viewFormat === 'flat' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Flat Feed"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* How-to hint */}
          <div className="p-3 rounded-[6px] bg-emerald-500/8 border border-emerald-600/20 flex items-start gap-2.5 text-xs">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-muted-foreground leading-relaxed">
              Click <span className="text-emerald-400 font-semibold font-mono">Set Public Record</span> on any reel to move it to Public mode.
              Your <span className="text-foreground">Security PIN</span> will be required to authorize.
              The 24h performance timer will start immediately after confirmation.
            </div>
          </div>

          {/* Empty State */}
          {filteredPosts.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground rounded-[6px] bg-secondary border border-border">
              {trialPosts.length === 0
                ? 'No trial reels logged yet. Switch to Trial mode and log your first test reel.'
                : 'No reels match your search.'}
            </div>

          ) : viewFormat === 'date_grouped' ? (

            /* DATE-WISE GROUPED */
            <div className="space-y-4 pt-1">
              {dateKeys.map(dateKey => {
                const group = groupedByDate[dateKey];
                return (
                  <div key={dateKey} className="rounded-[6px] bg-secondary/40 border border-border overflow-hidden">

                    {/* Date Header */}
                    <div className="px-3.5 py-2 bg-secondary/80 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {group.dateLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                        <span>{group.posts.length} {group.posts.length === 1 ? 'reel' : 'reels'}</span>
                        {group.totalViews > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-foreground">
                              <Eye className="w-3 h-3" />
                              {group.totalViews.toLocaleString()} views
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reel Rows */}
                    <div className="divide-y divide-border">
                      {group.posts.map(post => renderReelRow(post, false))}
                    </div>

                  </div>
                );
              })}
            </div>

          ) : (

            /* FLAT FEED */
            <div className="divide-y divide-border border-t border-border mt-2">
              {filteredPosts.map(post => renderReelRow(post, true))}
            </div>

          )}

        </div>
      </div>

      {/* Set Public Modal */}
      <SetPublicModal
        isOpen={!!setPublicTarget}
        onClose={() => setSetPublicTarget(null)}
        post={setPublicTarget}
        userProfile={userProfile}
        onOpenSettings={() => { setSetPublicTarget(null); onOpenSettings(); }}
        onSuccess={() => {
          setSetPublicTarget(null);
          onRefresh();
        }}
      />

    </div>
  );
};
