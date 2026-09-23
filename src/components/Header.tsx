import React, { useState, useEffect } from 'react';
import { Plus, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { PostType, EngineStage } from '../types';
import { formatTimeIST, formatDateIST } from '../utils/dateUtils';
import { User } from 'firebase/auth';

interface HeaderProps {
  activePostType: PostType;
  onPostTypeChange: (type: PostType) => void;
  onOpenQuickPost: () => void;
  publicCount: number;
  trialCount: number;
  pendingCheckInCount: number;
  currentStage: EngineStage;
  currentView: string;
  onToggleView: (view: any) => void;
  currentUser?: User | null;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePostType,
  onPostTypeChange,
  onOpenQuickPost,
  publicCount,
  trialCount,
  pendingCheckInCount,
  currentStage,
  currentView,
  onToggleView,
  currentUser,
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
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-2.5 transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand & Wordmark (With official Time Matrix Logo) */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-2.5">
            <div 
              onClick={() => onToggleView('app')}
              className="relative flex items-center justify-center cursor-pointer group"
              title="Time Matrix"
            >
              <img 
                src="/android-chrome-192x192.png" 
                alt="Time Matrix" 
                className="w-8 h-8 rounded-[8px] object-cover border border-border shadow-sm group-hover:scale-105 active:scale-95 transition-all" 
              />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-tight text-foreground leading-none">
                  time matrix
                </span>
                <span className="text-[9px] font-mono uppercase tracking-sec-label px-1 py-0.5 rounded-[4px] bg-secondary border border-border text-muted-foreground">
                  IST
                </span>
              </div>
              <button 
                onClick={() => onToggleView('explore')}
                className="text-[10px] text-muted-foreground hover:text-foreground font-mono leading-none mt-1 text-left flex items-center gap-1 transition-colors"
                title="Explore Arigato Labs"
              >
                <span>by Arigato Labs</span>
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/70" />
            <span>{currentDateIST} • {currentIST}</span>
          </div>

          {/* Mobile Add Post */}
          <button
            onClick={onOpenQuickPost}
            className="md:hidden h-8 px-3 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium active:scale-[0.99] transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Post</span>
          </button>
        </div>

        {/* Center: Tabs (Trial vs Public) */}
        <div className="flex items-center p-0.5 rounded-[6px] bg-secondary border border-border">
          <button
            onClick={() => onPostTypeChange('public')}
            className={`flex items-center gap-2 px-3 py-1 rounded-[5px] text-xs font-medium transition-all ${
              activePostType === 'public'
                ? 'bg-foreground text-background shadow-none font-semibold'
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
            className={`flex items-center gap-2 px-3 py-1 rounded-[5px] text-xs font-medium transition-all ${
              activePostType === 'trial'
                ? 'bg-foreground text-background shadow-none font-semibold'
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

        {/* Right Chrome */}
        <div className="hidden md:flex items-center gap-2">
          {/* Stage Mono Chip */}
          <span className="sec-label px-2.5 py-1 rounded-[5px] bg-secondary border border-border">
            {stageLabel}
          </span>

          {/* Pending Alerts */}
          {pendingCheckInCount > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-[5px] bg-secondary border border-border text-xs font-mono text-foreground">
              <Bell className="w-3 h-3 text-muted-foreground" />
              <span>{pendingCheckInCount}</span>
            </span>
          )}

          {/* User Auth Status */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="font-mono text-[11px] text-muted-foreground max-w-[120px] truncate" title={currentUser.email || ''}>
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
              <button
                onClick={onSignOut}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          {/* View Toggle: Overview / Console */}
          <button
            onClick={() => onToggleView(currentView === 'app' ? 'landing' : 'app')}
            className="h-8 px-2.5 rounded-[6px] border border-input bg-transparent text-foreground hover:bg-accent text-xs font-mono transition-colors"
            title="Toggle Landing Page / App Console"
          >
            {currentView === 'app' ? 'Overview' : 'Console'}
          </button>

          {/* Explore Arigato Labs */}
          <button
            onClick={() => onToggleView('explore')}
            className="h-8 px-2.5 rounded-[6px] border border-input bg-transparent text-foreground hover:bg-accent text-xs font-mono transition-colors flex items-center gap-1.5"
            title="Explore Arigato Labs"
          >
            <img 
              src="/arigato-single-logo.png" 
              alt="Arigato Labs" 
              style={{ width: 17, height: 17, objectFit: 'contain' }}
            />
            <span className="hidden xl:inline">Explore</span>
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenQuickPost}
            className="h-8 px-3.5 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Post</span>
          </button>
        </div>

      </div>
    </header>
  );
};
