import React, { useState } from 'react';
import { Post, PostType } from '../types';
import { formatTimeIST, formatDateIST, getTimeBucket, TIME_BUCKET_CONFIG } from '../utils/dateUtils';
import { Search, Trash2, Calendar, List, Layers, Clock, Eye } from 'lucide-react';
import { storageService } from '../services/storageService';

interface PostTimelineProps {
  posts: Post[];
  postType: PostType;
}

export const PostTimeline: React.FC<PostTimelineProps> = ({ posts, postType }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'completed' | 'pending'>('all');
  const [viewFormat, setViewFormat] = useState<'date_grouped' | 'flat'>('date_grouped');

  const filteredPosts = posts.filter(p => {
    const matchesSearch = !searchTerm || 
      (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.caption && p.caption.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === 'completed') return p.views_24h !== null;
    if (filterMode === 'pending') return p.views_24h === null;
    return true;
  });

  const handleDeletePost = (postId: string) => {
    storageService.deletePost(postId);
  };

  // Group by IST Date (YYYY-MM-DD or formatted date string)
  const groupedByDate: Record<string, { dateLabel: string; posts: Post[]; totalViews: number }> = {};
  
  filteredPosts.forEach(post => {
    const dateLabel = formatDateIST(post.posted_at, true); // e.g. "Wed, 23 Sep 2026"
    if (!groupedByDate[dateLabel]) {
      groupedByDate[dateLabel] = {
        dateLabel,
        posts: [],
        totalViews: 0,
      };
    }
    groupedByDate[dateLabel].posts.push(post);
    if (post.views_24h) {
      groupedByDate[dateLabel].totalViews += post.views_24h;
    }
  });

  const dateKeys = Object.keys(groupedByDate);

  return (
    <div className="rounded-[8px] bg-card border border-border p-5 space-y-4">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="sec-label">Date-Wise Posting Log</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {filteredPosts.length} {postType} reels
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chronological date-by-date journal of published reels and 24h verification outcomes
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Search bar */}
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

          {/* Grouped vs Flat View Switcher */}
          <div className="flex rounded-[6px] bg-secondary border border-border p-0.5 text-xs">
            <button
              onClick={() => setViewFormat('date_grouped')}
              className={`p-1.5 rounded-[5px] transition-colors ${
                viewFormat === 'date_grouped' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Group by Calendar Date"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewFormat('flat')}
              className={`p-1.5 rounded-[5px] transition-colors ${
                viewFormat === 'flat' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Continuous Feed"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status Filters */}
          <div className="flex rounded-[6px] bg-secondary border border-border p-0.5 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-[5px] font-mono text-[11px] transition-colors ${
                filterMode === 'all' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('completed')}
              className={`px-2.5 py-1 rounded-[5px] font-mono text-[11px] transition-colors ${
                filterMode === 'completed' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Verified
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-2.5 py-1 rounded-[5px] font-mono text-[11px] transition-colors ${
                filterMode === 'pending' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending
            </button>
          </div>

        </div>
      </div>

      {/* Empty State */}
      {filteredPosts.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground rounded-[6px] bg-secondary border border-border">
          {posts.length === 0 
            ? `No ${postType} reels logged yet. Log your first post above with a title to start your date-wise log.`
            : 'No reels match the selected search or filter.'}
        </div>
      ) : viewFormat === 'date_grouped' ? (
        
        /* DATE-WISE GROUPED VIEW */
        <div className="space-y-4 pt-1">
          {dateKeys.map(dateKey => {
            const group = groupedByDate[dateKey];
            return (
              <div key={dateKey} className="rounded-[6px] bg-secondary/40 border border-border overflow-hidden">
                
                {/* Date Group Header */}
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
                        <span className="text-foreground">{group.totalViews.toLocaleString()} total views</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Posts inside this Date */}
                <div className="divide-y divide-border">
                  {group.posts.map(post => {
                    const bucket = getTimeBucket(post.posted_at);
                    const isCompleted = post.views_24h !== null;

                    return (
                      <div
                        key={post.post_id}
                        className="py-3 px-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
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
                            {/* Title (Prominent) */}
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-foreground truncate max-w-sm sm:max-w-md">
                                {post.title || post.caption || 'Untitled Reel'}
                              </h4>
                              <span className="font-mono text-[10px] uppercase tracking-sec-label px-1.5 py-0.2 rounded-[4px] bg-secondary border border-border text-muted-foreground shrink-0">
                                {post.slot_source === 'algorithm' ? 'algo' : 'manual'}
                              </span>
                            </div>

                            {/* Time in IST & Bucket */}
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground mt-0.5">
                              <span className="text-foreground font-medium">
                                {formatTimeIST(post.posted_at)}
                              </span>
                              <span>•</span>
                              <span className="capitalize">{TIME_BUCKET_CONFIG[bucket].label} Bucket</span>
                              {post.caption && post.title && (
                                <>
                                  <span>•</span>
                                  <span className="text-muted-foreground truncate max-w-xs">{post.caption}</span>
                                </>
                              )}
                            </div>

                            {post.notes && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 italic">
                                "{post.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Views Status & Actions */}
                        <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          {isCompleted ? (
                            <div className="text-right font-mono">
                              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 justify-end">
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{post.views_24h?.toLocaleString()} views</span>
                              </div>
                              <div className="text-[10px] text-emerald-400">
                                24h locked
                              </div>
                            </div>
                          ) : (
                            <div className="font-mono text-[11px] text-muted-foreground px-2 py-0.5 rounded-[4px] bg-secondary border border-border flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>24h timer active</span>
                            </div>
                          )}

                          <button
                            onClick={() => handleDeletePost(post.post_id)}
                            className="p-1.5 rounded-[4px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* FLAT CONTINUOUS FEED VIEW */
        <div className="divide-y divide-border border-t border-border mt-2">
          {filteredPosts.map(post => {
            const bucket = getTimeBucket(post.posted_at);
            const isCompleted = post.views_24h !== null;

            return (
              <div
                key={post.post_id}
                className="py-3 px-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {post.media_ref ? (
                    <img
                      src={post.media_ref}
                      alt="Thumbnail"
                      className="w-10 h-10 rounded-[5px] object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-[5px] bg-secondary border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0">
                      reel
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground truncate max-w-sm sm:max-w-md">
                        {post.title || post.caption || 'Untitled Reel'}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-sec-label px-1.5 py-0.2 rounded-[4px] bg-secondary border border-border text-muted-foreground shrink-0">
                        {post.slot_source === 'algorithm' ? 'algo' : 'manual'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground mt-0.5">
                      <span>{formatDateIST(post.posted_at, false)} • {formatTimeIST(post.posted_at)}</span>
                      <span>•</span>
                      <span className="capitalize">{TIME_BUCKET_CONFIG[bucket].label}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {isCompleted ? (
                    <div className="text-right font-mono">
                      <div className="text-xs font-semibold text-foreground">
                        {post.views_24h?.toLocaleString()} views
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        24h verified
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-[11px] text-muted-foreground px-2 py-0.5 rounded-[4px] bg-secondary border border-border">
                      Timer active
                    </div>
                  )}

                  <button
                    onClick={() => handleDeletePost(post.post_id)}
                    className="p-1.5 rounded-[4px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
