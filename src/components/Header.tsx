import React, { useState, useEffect } from 'react';
import { Plus, Bell, LogOut, User as UserIcon, Zap } from 'lucide-react';
import { PostType, EngineStage, UserProfile } from '../types';
import { formatTimeIST, formatDateIST } from '../utils/dateUtils';
import { User } from 'firebase/auth';

interface HeaderProps {
  activePostType: PostType;
  onPostTypeChange: (type: PostType) => void;
  onOpenQuickPost: () => void;
  onOpenSmartSlots?: () => void;
  publicCount: number;
  trialCount: number;
  pendingCheckInCount: number;
  currentStage: EngineStage;
  currentView: string;
  onToggleView: (view: any) => void;
  currentUser?: User | null;
  userProfile?: UserProfile | null;
  onEditProfile?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePostType,
  onPostTypeChange,
  onOpenQuickPost,
  onOpenSmartSlots,
  publicCount,
  trialCount,
  pendingCheckInCount,
  currentStage,
  currentView,
  onToggleView,
  currentUser,
  userProfile,
  onEditProfile,
  onSignOut,
}) => {
  const [currentIST, setCurrentIST] = useState<string>('');
  const [currentDateIST, setCurrentDateIST] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const nowIso = new Date().toISOString();
      setCurrentIST(formatTimeIST(nowIso));
      setCurrentDateIST(formatDateIST(nowIso, true));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const stageLabel = {
    stage_1_descriptive: 'Stage 01 • Descriptive',
    stage_2_weighted: 'Stage 02 • Weighted',
    stage_3_bandit: 'Stage 03 • Bandit',
  }[currentStage];

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border transition-colors shadow-xs">
      
      {/* ============================================================ */}
      {/* LAYER 1: Global Identity, Live Clock & Account Nav          */}
      {/* ============================================================ */}
      <div className="border-b border-border/50 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          
          {/* Left: Brand + Live IST Clock */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div 
                onClick={() => onToggleView('app')}
                className="relative flex items-center justify-center cursor-pointer group"
                title="Time Matrix"
              >
                <img 
                  src="/android-chrome-192x192.png" 
                  alt="Time Matrix" 
                  className="w-7 h-7 rounded-[7px] object-cover border border-border shadow-xs group-hover:scale-105 active:scale-95 transition-all" 
                />
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs sm:text-sm font-semibold tracking-tight text-foreground leading-none">
                    time matrix
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-sec-label px-1 py-0.2 rounded-[3px] bg-secondary border border-border text-muted-foreground">
                    IST
                  </span>
                </div>
                <button 
                  onClick={() => onToggleView('explore')}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-mono leading-none mt-0.5 text-left flex items-center gap-1 transition-colors"
                  title="Explore Arigato Labs"
                >
                  <span>by Arigato Labs</span>
                </button>
              </div>
            </div>

            {/* Divider & Live IST Clock */}
            <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-border/60">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
                <span>{currentDateIST} • {currentIST}</span>
              </div>
            </div>
          </div>

          {/* Right: Creator Profile & Navigation */}
          <div className="flex items-center gap-2">
            {/* Creator Profile Chip & Sign Out */}
            {currentUser ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={onEditProfile}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] bg-secondary/80 border border-border hover:border-input transition-colors group cursor-pointer"
                  title="Edit Creator Profile"
                >
                  <UserIcon className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                  <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground max-w-[130px] truncate">
                    {userProfile?.name || currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  {userProfile?.age && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({userProfile.age}y)
                    </span>
                  )}
                </button>
                <button
                  onClick={onSignOut}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}

            {/* Divider */}
            <div className="hidden sm:block h-3.5 w-px bg-border/60" />

            {/* View Toggle: Overview / Console */}
            {currentView !== 'app' ? (
              <button
                onClick={() => onToggleView('app')}
                className="h-7 px-2.5 rounded-[5px] bg-primary text-primary-foreground text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Return to App Console"
              >
                <span>Console</span>
              </button>
            ) : !currentUser ? (
              <button
                onClick={() => onToggleView('landing')}
                className="h-7 px-2 rounded-[5px] border border-input bg-transparent text-foreground hover:bg-accent text-[11px] font-mono transition-colors cursor-pointer"
                title="View Landing Page"
              >
                Overview
              </button>
            ) : null}

            {/* Science / Article */}
            <button
              onClick={() => onToggleView('article')}
              className="h-7 px-2 rounded-[5px] border border-input bg-transparent text-foreground hover:bg-accent text-[11px] font-mono transition-colors cursor-pointer"
              title="The Science & Architecture of Time Matrix"
            >
              Article
            </button>

            {/* Explore Arigato Labs */}
            <button
              onClick={() => onToggleView('explore')}
              className="h-7 px-2 rounded-[5px] border border-input bg-transparent text-foreground hover:bg-accent text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Explore Arigato Labs"
            >
              <img 
                src="/arigato-single-logo.png" 
                alt="Arigato Labs" 
                style={{ width: 15, height: 15, objectFit: 'contain' }}
              />
              <span className="hidden md:inline">Explore</span>
            </button>
          </div>

        </div>
      </div>

      {/* ============================================================ */}
      {/* LAYER 2: Mode Switcher, Engine Stage & Primary Actions      */}
      {/* ============================================================ */}
      <div className="px-4 sm:px-6 py-2 bg-secondary/15">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          
          {/* Left: Mode Switcher (Public vs Trial) + Stage + Pending Alerts */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Tabs */}
            <div className="flex items-center p-0.5 rounded-[6px] bg-secondary border border-border shadow-xs">
              <button
                onClick={() => onPostTypeChange('public')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-xs font-medium transition-all cursor-pointer ${
                  activePostType === 'public'
                    ? 'bg-foreground text-background shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Public Reels</span>
                <span className={`font-mono text-[10px] px-1 py-0.2 rounded-sm ${
                  activePostType === 'public' ? 'bg-background/20 text-background' : 'text-muted-foreground'
                }`}>
                  {publicCount}
                </span>
              </button>

              <button
                onClick={() => onPostTypeChange('trial')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-xs font-medium transition-all cursor-pointer ${
                  activePostType === 'trial'
                    ? 'bg-foreground text-background shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Trial Reels</span>
                <span className={`font-mono text-[10px] px-1 py-0.2 rounded-sm ${
                  activePostType === 'trial' ? 'bg-background/20 text-background' : 'text-muted-foreground'
                }`}>
                  {trialCount}
                </span>
              </button>
            </div>

            {/* Stage Chip */}
            <span className="sec-label px-2.5 py-1 rounded-[5px] bg-secondary border border-border text-[10px]">
              {stageLabel}
            </span>

            {/* Pending Check-in Alerts */}
            {pendingCheckInCount > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-[5px] bg-secondary border border-border text-xs font-mono text-foreground" title="Pending 24h Check-ins">
                <Bell className="w-3 h-3 text-amber-400" />
                <span>{pendingCheckInCount}</span>
              </span>
            )}
          </div>

          {/* Right: Action Buttons (Smart Timings + Add Post) */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {/* Smart Timings Button */}
            {onOpenSmartSlots && (
              <button
                onClick={onOpenSmartSlots}
                className="h-8 px-3 rounded-[6px] bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-medium active:scale-[0.99] transition-all flex items-center gap-1.5 group shadow-xs cursor-pointer"
                title="Smart Posting Timing Recommendations for Today"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Smart Timings</span>
              </button>
            )}

            {/* Primary Action: Add Post */}
            <button
              onClick={onOpenQuickPost}
              className="h-8 px-3.5 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Post</span>
            </button>
          </div>

        </div>
      </div>

    </header>
  );
};
