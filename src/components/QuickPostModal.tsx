import React, { useState, useEffect } from 'react';
import { X, Clock, Upload } from 'lucide-react';
import { PostType, SlotSource } from '../types';
import { getCurrentUTC, formatFullIST, getTimeBucket, TIME_BUCKET_CONFIG } from '../utils/dateUtils';
import { storageService } from '../services/storageService';

interface QuickPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPostType: PostType;
  defaultSlotSource?: SlotSource;
}

export const QuickPostModal: React.FC<QuickPostModalProps> = ({
  isOpen,
  onClose,
  defaultPostType,
  defaultSlotSource = 'user',
}) => {
  const [postType, setPostType] = useState<PostType>(defaultPostType);
  const [slotSource, setSlotSource] = useState<SlotSource>(defaultSlotSource);
  const [timestampUTC, setTimestampUTC] = useState<string>(getCurrentUTC());
  const [title, setTitle] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTimestampUTC(getCurrentUTC());
      setPostType(defaultPostType);
      setSlotSource(defaultSlotSource);
      setTitle('');
      setCaption('');
      setNotes('');
      setMediaPreview(null);
    }
  }, [isOpen, defaultPostType, defaultSlotSource]);

  if (!isOpen) return null;

  const currentBucket = getTimeBucket(timestampUTC);
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
      await storageService.addPost({
        title: title.trim() || undefined,
        post_type: postType,
        posted_at: timestampUTC,
        caption: caption.trim() || undefined,
        notes: notes.trim() || undefined,
        slot_source: slotSource,
        media_ref: mediaPreview || undefined,
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
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Log New Reel</h2>
            <p className="text-xs text-muted-foreground">Captured timestamp will be locked permanently upon submission</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          
          {/* Automatic Timestamp Badge */}
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

          {/* Post Type Selector (Trial vs Public) */}
          <div>
            <label className="sec-label text-[10px] block mb-1.5">
              Post Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostType('public')}
                className={`p-2.5 rounded-[6px] border text-left transition-colors ${
                  postType === 'public'
                    ? 'bg-secondary border-foreground/60 text-foreground font-medium'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">Public Reel</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Standard distribution</div>
              </button>

              <button
                type="button"
                onClick={() => setPostType('trial')}
                className={`p-2.5 rounded-[6px] border text-left transition-colors ${
                  postType === 'trial'
                    ? 'bg-secondary border-foreground/60 text-foreground font-medium'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">Trial Reel</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Exploratory non-followers</div>
              </button>
            </div>
          </div>

          {/* Slot Source Selector */}
          <div>
            <label className="sec-label text-[10px] block mb-1.5">
              Slot Decision Source
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSlotSource('algorithm')}
                className={`p-2.5 rounded-[6px] border text-left transition-colors ${
                  slotSource === 'algorithm'
                    ? 'bg-secondary border-foreground/60 text-foreground font-medium'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">Algorithm Recommended</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Followed app prediction</div>
              </button>

              <button
                type="button"
                onClick={() => setSlotSource('user')}
                className={`p-2.5 rounded-[6px] border text-left transition-colors ${
                  slotSource === 'user'
                    ? 'bg-secondary border-foreground/60 text-foreground font-medium'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">Manual Choice</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Self-selected timing</div>
              </button>
            </div>
          </div>

          {/* Reel Title (Requested feature) */}
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

          {/* Caption */}
          <div>
            <label className="sec-label text-[10px] block mb-1">
              Caption / Hook Summary (Optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. 3 principles for clean code architecture..."
              className="w-full h-[34px] px-3 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring"
            />
          </div>

          {/* Reel Thumbnail / Supabase preview */}
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
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-black/80 text-foreground hover:text-white"
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

          {/* Notes */}
          <div>
            <label className="sec-label text-[10px] block mb-1">
              Experiment Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Tested fast 3s visual hook; trending audio"
              rows={2}
              className="w-full p-2.5 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none leading-relaxed"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-[6px] border border-input bg-transparent text-foreground hover:bg-accent text-xs font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8 px-4 rounded-[6px] bg-primary text-primary-foreground font-medium text-xs hover:bg-[#e0e0e0] active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Recording...' : 'Lock & Post Now'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
