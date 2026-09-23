import React, { useState } from 'react';
import { ArrowRight, Lock, CheckCircle2, LogIn } from 'lucide-react';
import { loginWithGoogle, logout } from '../config/firebase';
import { User } from 'firebase/auth';

interface LandingViewProps {
  onEnterApp: () => void;
  currentUser: User | null;
}

export const LandingView: React.FC<LandingViewProps> = ({ onEnterApp, currentUser }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const user = await loginWithGoogle();
      if (user) {
        onEnterApp();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#262626] selection:text-[#ffffff]">
      
      {/* Navigation */}
      <nav className="border-b border-border py-3.5 px-4 sm:px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src="/android-chrome-192x192.png" 
              alt="Time Matrix" 
              className="w-8 h-8 rounded-[8px] object-cover border border-border shadow-sm" 
            />
            <div className="flex flex-col">
              <span className="font-mono text-xs sm:text-sm font-semibold tracking-tight text-foreground leading-none">
                time matrix
              </span>
              <span className="text-[10px] text-muted-foreground font-mono leading-none mt-1">
                by Arigato Labs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline font-mono text-xs text-muted-foreground">
                  {currentUser.email}
                </span>
                <button
                  onClick={onEnterApp}
                  className="h-8 px-3.5 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center gap-1.5"
                >
                  <span>Launch Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="h-8 px-2.5 rounded-[6px] border border-input text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="h-8 px-3.5 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-border">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          
          {/* Big App Logo in Hero */}
          <div className="flex justify-center">
            <div className="p-2 rounded-[18px] bg-secondary/50 border border-border inline-block shadow-lg">
              <img 
                src="/android-chrome-192x192.png" 
                alt="Time Matrix App Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-[14px] object-cover shadow-sm"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[5px] bg-secondary border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
            <span className="sec-label text-[10px]">
              Instagram Reels Prediction Engine
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tightest text-foreground leading-[1.15]">
            Discover your highest-retention Instagram posting times.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Time Matrix logs exactly when you post reels, locks an immutable timestamp in IST, enforces a 24-hour verification checkpoint, and trains a self-learning contextual bandit to recommend your next viral window.
          </p>

          {authError && (
            <div className="p-3 rounded-[6px] bg-destructive/10 border border-destructive/30 text-xs font-mono text-destructive max-w-md mx-auto">
              {authError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {currentUser ? (
              <button
                onClick={onEnterApp}
                className="w-full sm:w-auto h-10 px-5 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span>Open Posting Console</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full sm:w-auto h-10 px-5 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoggingIn ? 'Signing in...' : 'Sign in with Google to Start'}</span>
              </button>
            )}

            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto h-10 px-4 rounded-[6px] border border-input bg-transparent text-foreground hover:bg-accent text-xs font-medium flex items-center justify-center transition-colors"
            >
              Enter Console directly
            </button>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-muted-foreground">
            <span>• Firestore Cloud Sync</span>
            <span>• Supabase Media Storage</span>
            <span>• Google Authentication</span>
          </div>

        </div>
      </section>

      {/* Core Loop & Features */}
      <section className="py-16 px-4 sm:px-8 max-w-5xl mx-auto w-full space-y-10">
        
        <div>
          <div className="sec-label mb-1">Architecture & Loop</div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tightest text-foreground">
            Built strictly around a disciplined 24-hour experiment loop
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="p-5 rounded-[8px] bg-card border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">01</span>
              <span className="sec-label text-[10px]">Data Integrity</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">Automatic IST Date & Time Capture</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              When you post, the timestamp is captured instantly in Indian Standard Time (stored in UTC). Once submitted, the timestamp is permanently immutable to prevent model corruption.
            </p>
          </div>

          <div className="p-5 rounded-[8px] bg-card border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">02</span>
              <span className="sec-label text-[10px]">Model Isolation</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">Trial vs. Public Reels Segregation</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              Trial reels are distributed to non-followers differently than standard public reels. Time Matrix runs separate timelines and separate machine models for each to ensure predictions are never contaminated.
            </p>
          </div>

          <div className="p-5 rounded-[8px] bg-card border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">03</span>
              <span className="sec-label text-[10px]">Feedback Cycle</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">24-Hour Performance Check-In</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              Each post counts down for 24 hours. At 24h, the app unlocks an inline prompt to record verified view counts, permanently locking the training tuple (day, time-bucket, views).
            </p>
          </div>

          <div className="p-5 rounded-[8px] bg-card border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">04</span>
              <span className="sec-label text-[10px]">Intelligence</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">3-Stage Self-Learning Bandit</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              Evolves across three honest stages: Cold Start descriptive stats (0–15 posts), Recency-weighted scoring (15–50 posts), and Contextual Multi-Armed Bandit (50+ posts) balancing exploitation with exploration.
            </p>
          </div>

        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-8 mt-auto text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
          <span>time matrix • personal reels prediction engine</span>
          <span>Google Firestore + Supabase Cloud Storage</span>
        </div>
      </footer>

    </div>
  );
};
