import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Upload, History, Calendar, CheckCircle2 } from 'lucide-react';
import { PostType, SlotSource } from '../types';
import { 
  getCurrentUTC, 
  formatFullIST, 
  getTimeBucket, 
  TIME_BUCKET_CONFIG, 
  getISTParts, 
  createUTCFromIST 
} from '../utils/dateUtils';
import { storageService } from '../services/storageService';

interface QuickPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPostType: PostType;
  defaultSlotSource?: SlotSource;
  initialTimestampUTC?: string;
  initialTitle?: string;
}

export const QuickPostModal: React.FC<QuickPostModalProps> = ({
  isOpen,
  onClose,
  defaultPostType,
  defaultSlotSource = 'user',
  initialTimestampUTC,
  initialTitle,
}) => {
  const [entryMode, setEntryMode] = useState<'live' | 'historical'>('live');
  const [postType, setPostType] = useState<PostType>(defaultPostType);
  const [slotSource, setSlotSource] = useState<SlotSource>(defaultSlotSource);
  const [timestampUTC, setTimestampUTC] = useState<string>(initialTimestampUTC || getCurrentUTC());
  
  // Historical backfill fields
  const [pastDate, setPastDate] = useState<string>('');
  const [pastTime, setPastTime] = useState<string>('18:00');
  const [historicalViews, setHistoricalViews] = useState<string>('');

  const [title, setTitle] = useState<string>(initialTitle || '');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      setEntryMode('live');
      setTimestampUTC(initialTimestampUTC || getCurrentUTC());
      setPostType(defaultPostType);
      setSlotSource(defaultSlotSource);
      setTitle(initialTitle || '');
      setMediaPreview(null);
      setHistoricalViews('');

      // Setup default past date to today in IST
      const ist = getISTParts(new Date());
      const m = ist.month + 1 < 10 ? `0${ist.month + 1}` : `${ist.month + 1}`;
      const d = ist.date < 10 ? `0${ist.date}` : `${ist.date}`;
      setPastDate(`${ist.year}-${m}-${d}`);
      const h = ist.hours < 10 ? `0${ist.hours}` : `${ist.hours}`;
      const min = ist.minutes < 10 ? `0${ist.minutes}` : `${ist.minutes}`;
      setPastTime(`${h}:${min}`);
    }
  }, [isOpen, defaultPostType, defaultSlotSource, initialTimestampUTC, initialTitle]);

  // Max selectable date for historical backfill is today in IST
  const maxDateIST = useMemo(() => {
    const ist = getISTParts(new Date());
    const m = ist.month + 1 < 10 ? `0${ist.month + 1}` : `${ist.month + 1}`;
    const d = ist.date < 10 ? `0${ist.date}` : `${ist.date}`;
    return `${ist.year}-${m}-${d}`;
  }, []);

  // Compute final effective timestamp
  const effectiveTimestampUTC = useMemo(() => {
    if (entryMode === 'live') {
      return timestampUTC;
    }
    try {
      if (!pastDate || !pastTime) return timestampUTC;
      const [y, m, d] = pastDate.split('-').map(Number);
      const [h, min] = pastTime.split(':').map(Number);
      return createUTCFromIST(y, m - 1, d, h, min);
    } catch {
      return timestampUTC;
    }
  }, [entryMode, timestampUTC, pastDate, pastTime]);

  if (!isOpen) return null;

  const currentBucket = getTimeBucket(effectiveTimestampUTC);
  const bucketInfo = TIME_BUCKET_CONFIG[currentBucket];

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const url = await storageService.uploadMedia(file);
        setMediaPreview(url);
      } catch (err) {
        console.error('Failed to preview image', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isHistorical = entryMode === 'historical';
      const parsedViews = isHistorical && historicalViews.trim() !== ''
        ? Math.max(0, parseInt(historicalViews.replace(/,/g, ''), 10))
        : null;

      await storageService.addPost({
        title: title.trim() || undefined,
        post_type: postType,
        posted_at: effectiveTimestampUTC,
        slot_source: isHistorical ? 'user' : slotSource,
        media_ref: mediaPreview || undefined,
        views_24h: parsedViews,
        check_in_completed_at: parsedViews !== null ? new Date().toISOString() : null,
      });

      onClose();
    } catch (err) {
      console.error('Failed to add post', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg rounded-[11px] bg-popover border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {entryMode === 'live' ? 'Log New Reel' : 'Backfill Past Reel Entry'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {entryMode === 'live' 
                ? 'Captured timestamp will be locked permanently upon submission' 
                : 'Directly record historical data with past IST date, time, and 24h views'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">

          {/* Entry Mode Toggle (Live vs Historical Backfill) */}
          <div className="flex items-center p-0.5 rounded-[6px] bg-secondary border border-border">
            <button
              type="button"
              onClick={() => setEntryMode('live')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[5px] text-xs font-medium transition-all cursor-pointer ${
                entryMode === 'live'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Live Post (Auto)</span>
            </button>

            <button
              type="button"
              onClick={() => setEntryMode('historical')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[5px] text-xs font-medium transition-all cursor-pointer ${
                entryMode === 'historical'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Past Date / Backfill</span>
            </button>
          </div>
          
          {/* Timestamp Display / Picker */}
          {entryMode === 'live' ? (
            <div className="p-3 rounded-[6px] bg-secondary border border-border flex items-start gap-3">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="sec-label text-[10px]">
                    Auto-Captured Timestamp (IST)
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {bucketInfo.label} Bucket
                  </span>
                </div>
                <p className="font-mono text-xs font-semibold text-foreground mt-0.5">
                  {formatFullIST(timestampUTC)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Stored in standard UTC, calculated in Indian Standard Time.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-[8px] bg-secondary/70 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="sec-label text-[10px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  Select Original Post Date & Time (IST)
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {bucketInfo.label} Bucket
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground block mb-1">
                    Date (IST)
                  </label>
                  <input
                    type="date"
                    required
                    max={maxDateIST}
                    value={pastDate}
                    onChange={(e) => setPastDate(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-[5px] bg-background border border-input text-foreground text-xs font-mono focus:outline-none focus:border-ring [color-scheme:dark] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-muted-foreground block mb-1">
                    Time (IST)
                  </label>
                  <input
                    type="time"
                    required
                    value={pastTime}
                    onChange={(e) => setPastTime(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-[5px] bg-background border border-input text-foreground text-xs font-mono focus:outline-none focus:border-ring [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>

              <div className="text-[11px] font-mono text-foreground/90 bg-background/60 p-2 rounded border border-border/70 flex items-center justify-between">
                <span>Mapped: <strong className="text-foreground">{formatFullIST(effectiveTimestampUTC)}</strong></span>
              </div>
            </div>
          )}

          {/* Historical Views Direct Input (Only shown in historical mode) */}
          {entryMode === 'historical' && (
            <div className="p-3.5 rounded-[8px] bg-emerald-500/10 border border-emerald-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  24-Hour Views Achieved *
                </label>
                <span className="font-mono text-[10px] text-emerald-400/80">Immediate Verification</span>
              </div>

              <input
                type="number"
                required
                min="0"
                step="1"
                value={historicalViews}
                onChange={(e) => setHistoricalViews(e.target.value)}
                placeholder="e.g. 14500"
                className="w-full h-9 px-3 rounded-[6px] bg-background border border-emerald-500/40 text-foreground font-mono text-sm font-semibold focus:outline-none focus:border-emerald-400 placeholder:text-muted-foreground placeholder:font-normal"
              />

              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                Since this reel has already elapsed 24 hours, its views will be locked immediately and instantly power up your Heatmap Matrix and Prediction Engine.
              </p>
            </div>
          )}

          {/* Post Type Selector (Trial vs Public) */}
          <div>
            <label className="sec-label text-[10px] block mb-1.5">
              Post Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostType('public')}
                className={`p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer ${
                  postType === 'public'
                    ? 'bg-secondary border-foreground/60 text-foreground font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <div className="font-mono text-xs uppercase tracking-wider font-semibold">
                  Public Reel
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Live to full following & algorithm
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPostType('trial')}
                className={`p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer ${
                  postType === 'trial'
                    ? 'bg-secondary border-foreground/60 text-foreground font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <div className="font-mono text-xs uppercase tracking-wider font-semibold">
                  Trial Reel
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Micro-audience hook/format test
                </div>
              </button>
            </div>
          </div>

          {/* Slot Source Selector (Only in live mode) */}
          {entryMode === 'live' && (
            <div>
              <label className="sec-label text-[10px] block mb-1.5">
                Posting Slot Source
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSlotSource('user')}
                  className={`p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer ${
                    slotSource === 'user'
                      ? 'bg-secondary border-foreground/60 text-foreground font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
                >
                  <div className="font-mono text-xs uppercase tracking-wider font-semibold">
                    My Choice
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Self-selected timing
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSlotSource('algorithm')}
                  className={`p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer ${
                    slotSource === 'algorithm'
                      ? 'bg-secondary border-foreground/60 text-foreground font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
                >
                  <div className="font-mono text-xs uppercase tracking-wider font-semibold">
                    Algorithm Slot
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Following system recommendation
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="sec-label text-[10px] block mb-1">
              Reel Title / Hook Headline *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5 Mistakes Every Junior Dev Makes in Their First Year"
              className="w-full h-[34px] px-3 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring font-medium"
            />
          </div>

          {/* Thumbnail Upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="sec-label text-[10px]">
                Thumbnail (Optional)
              </label>
              <span className="font-mono text-[10px] text-muted-foreground">Supabase Storage</span>
            </div>

            {mediaPreview ? (
              <div className="relative rounded-[6px] overflow-hidden border border-border h-24 w-full">
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setMediaPreview(null)}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-black/80 text-foreground hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-input hover:border-foreground/50 rounded-[6px] cursor-pointer bg-background transition-colors text-xs text-muted-foreground hover:text-foreground">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload thumbnail image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-[6px] border border-input bg-transparent text-foreground hover:bg-accent text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8 px-4 rounded-[6px] bg-primary text-primary-foreground font-medium text-xs hover:bg-[#e0e0e0] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting 
                ? 'Recording...' 
                : entryMode === 'historical' 
                ? 'Save Historical Entry' 
                : 'Lock & Post Now'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
