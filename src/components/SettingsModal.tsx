import React, { useState } from 'react';
import { X, ShieldCheck, Lock, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { userService } from '../services/userService';
import { User } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  userProfile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onProfileUpdated,
}) => {
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const hasExistingPin = Boolean(userProfile?.deletion_pin);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // If already has PIN, verify current PIN first
    if (hasExistingPin) {
      if (currentPinInput !== userProfile?.deletion_pin) {
        setErrorMsg('Current PIN is incorrect.');
        return;
      }
    }

    if (!/^\d{4}$/.test(newPinInput)) {
      setErrorMsg('PIN must be exactly 4 digits (e.g. 1234).');
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setErrorMsg('New PIN and Confirm PIN do not match.');
      return;
    }

    if (!userProfile) {
      setErrorMsg('User profile not found. Please complete profile setup first.');
      return;
    }

    setIsSaving(true);
    const updatedProfile: UserProfile = {
      ...userProfile,
      deletion_pin: newPinInput,
      updated_at: new Date().toISOString(),
    };

    try {
      await userService.saveUserProfile(updatedProfile);
      onProfileUpdated(updatedProfile);
      setSuccessMsg('Security PIN saved successfully. It is now required to delete any post.');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
    } catch (err) {
      console.error('Failed to update PIN:', err);
      setErrorMsg('Failed to save PIN to cloud. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePin = async () => {
    if (!hasExistingPin || !userProfile) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (currentPinInput !== userProfile.deletion_pin) {
      setErrorMsg('Enter your current PIN to remove security protection.');
      return;
    }

    setIsSaving(true);
    const updatedProfile: UserProfile = {
      ...userProfile,
      deletion_pin: undefined,
      updated_at: new Date().toISOString(),
    };

    try {
      await userService.saveUserProfile(updatedProfile);
      onProfileUpdated(updatedProfile);
      setSuccessMsg('Security PIN removed. Posts can now be deleted with standard confirmation.');
      setCurrentPinInput('');
    } catch (err) {
      console.error('Failed to remove PIN:', err);
      setErrorMsg('Failed to update settings in cloud.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-md rounded-[11px] bg-popover border border-border shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[5px] bg-secondary border border-border">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Settings & Deletion Security
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">
                Manage your protection PIN and preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* Account Status Card */}
          <div className="p-3.5 rounded-[8px] bg-secondary/60 border border-border space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connected Account</span>
              <span className="text-emerald-400 font-medium">Active</span>
            </div>
            <p className="text-foreground font-semibold truncate">
              {currentUser.email}
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              <span>Creator Profile:</span>
              <span className="text-foreground">{userProfile?.name || 'Standard'} ({userProfile?.age || '25'}y)</span>
            </div>
          </div>

          {/* Deletion Protection Status Banner */}
          <div className={`p-3.5 rounded-[8px] border flex items-start gap-3 text-xs leading-relaxed ${
            hasExistingPin 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <Lock className={`w-4 h-4 shrink-0 mt-0.5 ${hasExistingPin ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <div className="font-semibold text-foreground">
                {hasExistingPin ? 'Deletion PIN Protection Active' : 'No Deletion PIN Configured'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {hasExistingPin 
                  ? 'Your posts are protected. Deleting any reel will require entering your 4-digit security PIN.' 
                  : 'Set a 4-digit security PIN below so no one can accidentally or mistakenly delete your reels.'}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-[6px] bg-destructive/10 border border-destructive/30 text-xs font-mono text-destructive flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-[6px] bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* PIN Setup Form */}
          <form onSubmit={handleSavePin} className="space-y-3.5">
            <div className="sec-label text-[10px] flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-foreground" />
              <span>{hasExistingPin ? 'Change Security PIN' : 'Set New 4-Digit Deletion PIN'}</span>
            </div>

            {hasExistingPin && (
              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                  Current PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-9 px-3 rounded-[6px] bg-background border border-input text-foreground font-mono text-sm tracking-widest focus:outline-none focus:border-ring placeholder:text-muted-foreground"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                  New 4-Digit PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-9 px-3 rounded-[6px] bg-background border border-input text-foreground font-mono text-sm tracking-widest focus:outline-none focus:border-ring placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                  Confirm PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-9 px-3 rounded-[6px] bg-background border border-input text-foreground font-mono text-sm tracking-widest focus:outline-none focus:border-ring placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {hasExistingPin ? (
                <button
                  type="button"
                  onClick={handleRemovePin}
                  disabled={isSaving || !currentPinInput}
                  className="text-xs text-destructive hover:underline disabled:opacity-50 cursor-pointer font-mono"
                >
                  Remove PIN
                </button>
              ) : <div />}

              <button
                type="submit"
                disabled={isSaving || newPinInput.length !== 4 || confirmPinInput.length !== 4}
                className="h-8 px-4 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSaving ? 'Saving...' : hasExistingPin ? 'Update PIN' : 'Save PIN'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
