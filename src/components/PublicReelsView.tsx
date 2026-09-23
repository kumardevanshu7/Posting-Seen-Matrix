import React, { useState } from 'react';
import { Post, UserProfile } from '../types';
import { formatTimeIST, formatDateIST, formatFullIST, getTimeBucket, TIME_BUCKET_CONFIG, getCheckInStatus } from '../utils/dateUtils';
import {
  Search, Trash2, Calendar, List, Eye, ArrowLeft, Globe, Clock, CheckCircle2,
} from 'lucide-react';

interface PublicReelsViewProps {
  publicPosts: Post[];
  userProfile: UserProfile | null;
  onBack: () => void;
  onRequestDeletePost: (post: Post) => void;
}

export const PublicReelsView: React.FC<PublicReelsViewProps> = ({
  publicPosts,
  userProfile,
  onBack,
  onRequestDeletePost,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFormat, setViewFormat] = useState<'date_grouped' | 'flat'>('date_grouped');
  const [filterMode, setFilterMode] = useState<'all' | 'verified' | 'pending'>('all');

  const filteredPosts = publicPosts.filter(p => {
    const matchesSearch = !searchTerm ||
      (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.caption && p.caption.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterMode === 'verified') return p.views_24h !== null;
    if (filterMode === 'pending') return p.views_24h === null;
    return true;
  });

  // Group by original IST Date
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
  const verifiedCount = publicPosts.filter(p => p.views_24h !== null).length;
  const pendingCount = publicPosts.filter(p => p.views_24h === null).length;

  // Shared reel row renderer
  const renderReelRow = (post: Post, compact = false) => {
    const bucket = getTimeBucket(post.posted_at);
    const isVerified = post.views_24h !== null;
    const isPromoted = !!post.promoted_to_public_at;

    // For timer: use promoted_to_public_at if it exists, else posted_at
    const status = isVerified ? null : getCheckInStatus(post.posted_at, post.promoted_to_public_at);

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
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                {post.title || post.caption || 'Untitled Reel'}
              </h4>
              <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-secondary border border-border text-muted-foreground shrink-0">
                {post.slot_source === 'algorithm' ? 'algo' : 'manual'}
              </span>
              {isPromoted && (
                <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-violet-600/15 border border-violet-600/30 text-violet-400 shrink-0">
                  promoted
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground mt-0.5">
              <span className="text-foreground font-medium">{formatTimeIST(post.posted_at)}</span>
              <span>•</span>
              <span className="capitalize">{TIME_BUCKET_CONFIG[bucket].label} Bucket</span>
              {isPromoted && (
                <>
                  <span>•</span>
                  <span className="text-violet-400/90 font-mono text-[11px]">
                    {post.trial_views_24h ? `Trial: ${post.trial_views_24h.toLocaleString()} views • ` : ''}
                    Published {post.promoted_to_public_at ? formatFullIST(post.promoted_to_public_at) : ''}
                  </span>
                </>
              )}
              {compact && (
                <>
                  <span>•</span>
                  <span>{formatDateIST(post.posted_at, false)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status + Actions */}
        <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
          {isVerified ? (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground font-semibold">{post.views_24h!.toLocaleString()} views</span>
              <span className="text-emerald-400 ml-1">24h locked</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {status?.isReady ? (
                  <span className="text-amber-400 font-medium">Ready for check-in</span>
                ) : (
                  status?.timeRemainingFormatted
                )}
              </span>
            </div>
          )}

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
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
                  Public Reels Board
                </span>
                <span className="font-mono text-[11px] text-muted-foreground px-1.5 py-0.5 rounded-[4px] bg-secondary border border-border">
                  {verifiedCount} verified · {pendingCount} pending
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                All public reels — verified 24h data and pending check-ins
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="sec-label">Date-Wise Public Log</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {filteredPosts.length} reels
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chronological log of public reels and their 24h view verification outcomes
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

              {/* Filter */}
              <div className="flex rounded-[6px] bg-secondary border border-border p-0.5 text-xs">
                {(['all', 'verified', 'pending'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterMode(f)}
                    className={`px-2 py-1 rounded-[5px] font-mono text-[11px] capitalize transition-colors ${
                      filterMode === f ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f}
                  </button>
                ))}
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

          {/* Stats row */}
          <div className="flex items-center gap-4 p-3 rounded-[6px] bg-secondary/50 border border-border text-xs font-mono">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-foreground font-semibold">{verifiedCount}</span>
              <span>verified</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-foreground font-semibold">{pendingCount}</span>
              <span>pending check-in</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-foreground font-semibold">
                {publicPosts.filter(p => p.views_24h !== null).reduce((s, p) => s + (p.views_24h || 0), 0).toLocaleString()}
              </span>
              <span>total verified views</span>
            </div>
          </div>

          {/* Empty State */}
          {filteredPosts.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground rounded-[6px] bg-secondary border border-border">
              {publicPosts.length === 0
                ? 'No public reels yet. Log a public post or promote a trial reel.'
                : 'No reels match your filter.'}
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
                              {group.totalViews.toLocaleString()} total views
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

    </div>
  );
};
