import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, AlertTriangle, Upload, Check, ImageIcon, Loader2 } from 'lucide-react';
import { Post, UserProfile } from '../types';
import { formatFullIST } from '../utils/dateUtils';
import { storageService } from '../services/storageService';
import { ReelThumbnail } from './ReelThumbnail';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  userProfile: UserProfile | null;
  onOpenSettings: () => void;
  onSuccess: () => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  post,
  userProfile,
  onOpenSettings,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && post) {
      setTitle(post.title || post.caption || '');
      setMediaUrl(post.media_ref);
      setPinInput('');
      setErrorMsg(null);
      setIsSaving(false);
      setIsUploadingMedia(false);
    }
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const hasPinConfigured = Boolean(userProfile?.deletion_pin);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingMedia(true);
      setErrorMsg(null);
      try {
        const publicUrl = await storageService.uploadMedia(file);
        setMediaUrl(publicUrl);
      } catch (err) {
        console.error('Failed to upload thumbnail:', err);
        setErrorMsg('Failed to upload thumbnail image. Please try again.');
      } finally {
        setIsUploadingMedia(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // PIN Authentication
    if (hasPinConfigured) {
      if (!pinInput) {
        setErrorMsg('Please enter your 4-digit Security PIN to authorize changes.');
        return;
      }
      if (pinInput !== userProfile?.deletion_pin) {
        setErrorMsg('Incorrect Security PIN. Authorization failed.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const success = await storageService.updatePost(post.post_id, {
        title: title.trim() || undefined,
        media_ref: mediaUrl || undefined,
      });

      if (success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Post not found or could not be updated.');
      }
    } catch (err) {
      console.error('Failed to update post:', err);
      setErrorMsg('An error occurred while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-[11px] bg-popover border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center border border-border text-foreground">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Edit Reel & Thumbnail
              </h2>
              <span className="font-mono text-[10px] text-muted-foreground block">
                PIN Protected · Updates Cloud & Local
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">

          {/* Current Post Info */}
          <div className="p-3 rounded-[6px] bg-secondary/50 border border-border flex items-center justify-between text-xs font-mono">
            <span className="uppercase text-muted-foreground">
              {post.post_type === 'trial' ? 'Trial Reel' : 'Public Reel'}
            </span>
            <span className="text-muted-foreground">
              Posted: {formatFullIST(post.posted_at)}
            </span>
          </div>

          {/* Thumbnail Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Thumbnail Image</span>
              {mediaUrl && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3 h-3" /> Image attached
                </span>
              )}
            </label>

            <div className="flex items-center gap-3 p-3 rounded-[6px] bg-secondary/30 border border-border">
              {/* Preview */}
              <div className="relative">
                <ReelThumbnail src={mediaUrl} size="w-16 h-16" />
                {isUploadingMedia && (
                  <div className="absolute inset-0 bg-black/70 rounded-[5px] flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-foreground animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia}
                  className="h-8 px-3 rounded-[5px] bg-secondary border border-border hover:bg-accent hover:border-input text-foreground font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isUploadingMedia ? 'Uploading...' : mediaUrl ? 'Change Picture' : 'Upload Picture'}</span>
                </button>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Uploads directly to Supabase storage bucket
                </p>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Reel Title / Hook
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Golden Hour Couple Portrait..."
              className="w-full h-9 px-3 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring font-mono"
            />
          </div>

          {/* PIN Input Section */}
          <div className="pt-2 border-t border-border space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Security PIN (Password)</span>
              {hasPinConfigured && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Required
                </span>
              )}
            </label>

            {hasPinConfigured ? (
              <div className="relative">
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Enter your security PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-background border border-input text-foreground text-xs font-mono tracking-widest placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                  autoFocus
                />
              </div>
            ) : (
              <div className="p-2.5 rounded-[6px] bg-secondary/40 border border-border flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-muted-foreground">
                  No Security PIN configured yet.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="text-foreground underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Set one up in Settings
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-[6px] bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-[5px] border border-border text-foreground hover:bg-secondary font-mono text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingMedia}
              className="h-8 px-4 rounded-[5px] bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
