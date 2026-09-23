import React, { useState, useEffect } from 'react';
import { X, Globe, Lock, AlertTriangle } from 'lucide-react';
import { Post, UserProfile } from '../types';
import { formatFullIST } from '../utils/dateUtils';
import { storageService } from '../services/storageService';

interface SetPublicModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  userProfile: UserProfile | null;
  onOpenSettings: () => void;
  onSuccess: () => void;
}

export const SetPublicModal: React.FC<SetPublicModalProps> = ({
  isOpen,
  onClose,
  post,
  userProfile,
  onOpenSettings,
  onSuccess,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setErrorMsg(null);
      setIsPromoting(false);
    }
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const hasPinConfigured = Boolean(userProfile?.deletion_pin);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (hasPinConfigured) {
      if (pinInput !== userProfile?.deletion_pin) {
        setErrorMsg('Incorrect Security PIN. Action aborted.');
        return;
      }
    }

    setIsPromoting(true);
    try {
      const success = await storageService.promoteTrialToPublic(post.post_id);
      if (success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Post not found. It may have already been removed.');
      }
    } catch (err) {
      console.error('Promote to public failed:', err);
      setErrorMsg('Failed to set public record. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-[11px] bg-popover border border-border shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-emerald-500/10">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-[4px] bg-emerald-500/20 text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Set Public Record
              </h2>
              <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider">
                Trial → Public · 24h Timer Starts
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
        <form onSubmit={handlePromote} className="p-5 space-y-4">

          {/* Post preview card */}
          <div className="p-3 rounded-[6px] bg-secondary/70 border border-border space-y-1.5 text-xs flex items-center gap-3">
            {post.media_ref ? (
              <img
                src={post.media_ref}
                alt="Thumbnail"
                className="w-12 h-12 rounded-[5px] object-cover border border-border shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-[5px] bg-secondary border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0">
                reel
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground text-xs line-clamp-2">
                {post.title || post.caption || 'Untitled Reel'}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                Trial posted: {formatFullIST(post.posted_at)}
              </p>
            </div>
          </div>

          {/* What will happen */}
          <div className="p-3 rounded-[6px] bg-secondary/50 border border-border text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <p className="text-foreground font-medium text-xs">What happens next:</p>
            <ul className="space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-mono mt-0.5">→</span>
                <span>Reel moves from <strong className="text-foreground">Trial</strong> to <strong className="text-foreground">Public</strong> category</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-mono mt-0.5">→</span>
                <span><strong className="text-foreground">24h timer starts now</strong> — check back tomorrow to log views</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-mono mt-0.5">→</span>
                <span>After views are entered, post gets <strong className="text-foreground">archived</strong> in your Public log</span>
              </li>
            </ul>
          </div>

          {/* Security PIN */}
          {hasPinConfigured ? (
            <div className="p-3.5 rounded-[8px] bg-secondary/80 border border-border space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Enter Security PIN to Authorize *
              </label>

              <input
                type="password"
                required
                autoFocus
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-10 px-3 rounded-[6px] bg-background border border-input text-foreground font-mono text-center text-lg tracking-[0.3em] font-semibold focus:outline-none focus:border-emerald-500 placeholder:text-muted-foreground"
              />

              <p className="text-[11px] text-muted-foreground">
                Protected by your security PIN configured in Settings.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-[6px] bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="flex-1">
                <span>No security PIN set. Set one to protect this action. </span>
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenSettings(); }}
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
              disabled={isPromoting || (hasPinConfigured && pinInput.length !== 4)}
              className="h-8 px-4 rounded-[6px] bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isPromoting ? 'Setting Public...' : 'Set as Public Post'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
