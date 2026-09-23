import React, { useState, useEffect } from 'react';
import { X, Trash2, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Post, UserProfile } from '../types';
import { formatFullIST } from '../utils/dateUtils';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  userProfile: UserProfile | null;
  onConfirmDelete: (postId: string) => Promise<void>;
  onOpenSettings: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  post,
  userProfile,
  onConfirmDelete,
  onOpenSettings,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setErrorMsg(null);
      setIsDeleting(false);
    }
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const hasPinConfigured = Boolean(userProfile?.deletion_pin);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // If PIN protection is active, verify PIN
    if (hasPinConfigured) {
      if (pinInput !== userProfile?.deletion_pin) {
        setErrorMsg('Incorrect Security PIN. Deletion aborted.');
        return;
      }
    }

    setIsDeleting(true);
    try {
      await onConfirmDelete(post.post_id);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      setErrorMsg('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-md rounded-[11px] bg-popover border border-destructive/40 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-destructive/10">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-[4px] bg-destructive/20 text-destructive">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Confirm Reel Deletion
              </h2>
              <span className="font-mono text-[10px] text-destructive uppercase tracking-sec-label">
                Irreversible Action
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
        <form onSubmit={handleDelete} className="p-5 space-y-4">
          
          {/* Post preview card */}
          <div className="p-3 rounded-[6px] bg-secondary/70 border border-border space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-background border border-border text-foreground">
                {post.post_type === 'trial' ? 'Trial Reel' : 'Public Reel'}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {post.views_24h !== null ? `${post.views_24h.toLocaleString()} views` : 'Pending Check-In'}
              </span>
            </div>
            <p className="font-medium text-foreground text-xs line-clamp-2">
              {post.title || post.caption || 'Untitled Reel'}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              Posted: {formatFullIST(post.posted_at)}
            </p>
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed">
            This reel will be permanently purged from your Heatmap Matrix, Prediction Bandit, and Cloud Firestore.
          </div>

          {/* Security PIN Requirement */}
          {hasPinConfigured ? (
            <div className="p-3.5 rounded-[8px] bg-secondary/80 border border-border space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Enter 4-Digit Security PIN to Authorize *
              </label>
              
              <input
                type="password"
                required
                autoFocus
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-10 px-3 rounded-[6px] bg-background border border-input text-foreground font-mono text-center text-lg tracking-[0.3em] font-semibold focus:outline-none focus:border-destructive placeholder:text-muted-foreground"
              />

              <p className="text-[11px] text-muted-foreground">
                Protected by your custom deletion PIN configured in Settings.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-[6px] bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="flex-1">
                <span>No security PIN set. Anyone with access to this browser can delete posts. </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="underline hover:text-white ml-1 font-semibold cursor-pointer"
                >
                  Set PIN in Settings
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-[5px] bg-destructive/15 border border-destructive/30 text-xs font-mono text-destructive">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
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
              disabled={isDeleting || (hasPinConfigured && pinInput.length !== 4)}
              className="h-8 px-4 rounded-[6px] bg-destructive text-destructive-foreground font-medium text-xs hover:bg-destructive/90 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
