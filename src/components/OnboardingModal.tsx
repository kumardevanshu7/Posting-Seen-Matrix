import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Gender, RelationshipStatus } from '../types';
import { userService } from '../services/userService';
import { ArrowRight, Sparkles, UserCheck } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  currentUser: User;
  onComplete: (profile: UserProfile) => void;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-Binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const RELATIONSHIP_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'in-a-relationship', label: 'In a Relationship' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'married', label: 'Married' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  currentUser,
  onComplete,
}) => {
  const [name, setName] = useState<string>(currentUser.displayName || '');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender>('prefer-not-to-say');
  const [relationship, setRelationship] = useState<RelationshipStatus>('single');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAge = parseInt(age, 10);
    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (isNaN(parsedAge) || parsedAge < 13 || parsedAge > 100) {
      setErrorMsg('Please enter a valid age between 13 and 100.');
      return;
    }

    setIsSaving(true);
    const nowIso = new Date().toISOString();

    const profile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      name: name.trim(),
      age: parsedAge,
      gender,
      relationship,
      onboarding_completed: true,
      created_at: nowIso,
      updated_at: nowIso,
    };

    try {
      await userService.saveUserProfile(profile);
      onComplete(profile);
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      // Even if cloud save fails momentarily, local cache works and allows continuing
      onComplete(profile);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md transition-all">
      <div className="w-full max-w-lg rounded-[10px] bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Header with App Logo */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <img 
            src="/android-chrome-192x192.png" 
            alt="Time Matrix" 
            className="w-10 h-10 rounded-[8px] object-cover border border-border shadow-sm shrink-0" 
          />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-secondary border border-border text-[10px] font-mono uppercase tracking-sec-label text-foreground mb-1">
              <Sparkles className="w-3 h-3 text-foreground" />
              <span>Creator Onboarding</span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tightest text-foreground">
              Welcome to Time Matrix
            </h2>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Set up your creator profile. Foundational demographic context helps calibrate audience behavior insights and time slot retention patterns.
        </p>

        {errorMsg && (
          <div className="p-3 rounded-[6px] bg-destructive/10 border border-destructive/30 text-xs font-mono text-destructive">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="sec-label text-[10px] block mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Kumar"
              className="w-full h-[36px] px-3 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring font-medium"
            />
          </div>

          {/* Age */}
          <div>
            <label className="sec-label text-[10px] block mb-1">
              Age * (13 – 100)
            </label>
            <input
              type="number"
              required
              min={13}
              max={100}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 24"
              className="w-full h-[36px] px-3 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring font-mono"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="sec-label text-[10px] block mb-1.5">
              Gender *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {GENDER_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  className={`h-9 px-2 rounded-[6px] text-xs font-medium border transition-all ${
                    gender === opt.value
                      ? 'bg-foreground text-background border-foreground font-semibold shadow-none'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <label className="sec-label text-[10px] block mb-1.5">
              Relationship Status *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {RELATIONSHIP_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setRelationship(opt.value)}
                  className={`h-9 px-2 rounded-[6px] text-xs font-medium border transition-all ${
                    relationship === opt.value
                      ? 'bg-foreground text-background border-foreground font-semibold shadow-none'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-10 px-4 rounded-[6px] bg-primary text-primary-foreground text-xs font-semibold hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSaving ? 'Saving Profile...' : 'Complete Setup & Launch Console'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </form>

        <div className="text-center font-mono text-[10px] text-muted-foreground">
          Encrypted & synced with Arigato Labs Cloud Firestore
        </div>

      </div>
    </div>
  );
};
