import React, { useState, useEffect } from 'react';
import { PostType, SlotSource, TimeSlotRecommendation } from './types';
import { storageService } from './services/storageService';
import { generateRecommendation, computeMatrixStats, computeComparisonReport, getEngineStage } from './services/predictionEngine';
import { Header } from './components/Header';
import { RecommendationHero } from './components/RecommendationHero';
import { CheckInQueue } from './components/CheckInQueue';
import { PerformanceComparison } from './components/PerformanceComparison';
import { HeatmapMatrix } from './components/HeatmapMatrix';
import { ExternalSignalsSection } from './components/ExternalSignalsSection';
import { PostTimeline } from './components/PostTimeline';
import { QuickPostModal } from './components/QuickPostModal';
import { LandingView } from './components/LandingView';
import { ExploreView } from './components/ExploreView';
import { AboutView } from './components/AboutView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { DisclaimerView } from './components/DisclaimerView';
import { ContactView } from './components/ContactView';
import { LegalFooter } from './components/LegalFooter';
import { RecommendationSkeleton, MatrixSkeleton, TimelineSkeleton } from './components/SkeletonLoader';
import { isFirebaseConfigured, subscribeToAuth, logout } from './config/firebase';
import { isSupabaseConfigured } from './config/supabase';
import { User } from 'firebase/auth';
import { Plus, LayoutDashboard, Compass } from 'lucide-react';

export const App: React.FC = () => {
  const [activePostType, setActivePostType] = useState<PostType>('public');
  const [currentView, setCurrentView] = useState<'app' | 'landing' | 'explore' | 'about' | 'privacy' | 'terms' | 'disclaimer' | 'contact'>('landing');
  const [isQuickPostOpen, setIsQuickPostOpen] = useState(false);
  const [defaultSlotSource, setDefaultSlotSource] = useState<SlotSource>('user');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setVersion] = useState(0);

  // Subscribe to Firebase Auth changes
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        // If user is signed in, default to console view
        setCurrentView('app');
      }
    });
    return unsubAuth;
  }, []);

  // Subscribe to storage updates & handle skeleton loading
  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 400);

    const unsubscribe = storageService.subscribe(() => {
      if (mounted) {
        setVersion(v => v + 1);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // Fetch posts strictly segregated by post type (Trial vs Public never mixed)
  const allPosts = storageService.getPosts();
  const currentPosts = storageService.getPosts(activePostType);
  const publicPosts = storageService.getPosts('public');
  const trialPosts = storageService.getPosts('trial');
  const externalSignals = storageService.getSignals();

  const completedPosts = currentPosts.filter(p => p.views_24h !== null);
  const pendingCheckInCount = allPosts.filter(p => p.views_24h === null).length;

  const recommendation = generateRecommendation(currentPosts);
  const matrixStats = computeMatrixStats(currentPosts);
  const comparisonReport = computeComparisonReport(currentPosts);
  const currentStage = getEngineStage(completedPosts.length);

  const handleOpenQuickPost = () => {
    setDefaultSlotSource('user');
    setIsQuickPostOpen(true);
  };

  const handleUseRecommendedSlot = (_slot: TimeSlotRecommendation) => {
    setDefaultSlotSource('algorithm');
    setIsQuickPostOpen(true);
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentView('landing');
  };

  const firebaseReady = isFirebaseConfigured();
  const supabaseReady = isSupabaseConfigured();

  // Route Views
  if (currentView === 'landing') {
    return <LandingView onEnterApp={() => setCurrentView('app')} currentUser={currentUser} />;
  }
  if (currentView === 'explore') {
    return <ExploreView onNavigate={setCurrentView} />;
  }
  if (currentView === 'about') {
    return <AboutView onNavigate={setCurrentView} />;
  }
  if (currentView === 'privacy') {
    return <PrivacyView onNavigate={setCurrentView} />;
  }
  if (currentView === 'terms') {
    return <TermsView onNavigate={setCurrentView} />;
  }
  if (currentView === 'disclaimer') {
    return <DisclaimerView onNavigate={setCurrentView} />;
  }
  if (currentView === 'contact') {
    return <ContactView onNavigate={setCurrentView} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-16 sm:pb-0">
      
      {/* Top Header */}
      <Header
        activePostType={activePostType}
        onPostTypeChange={setActivePostType}
        onOpenQuickPost={handleOpenQuickPost}
        publicCount={publicPosts.length}
        trialCount={trialPosts.length}
        pendingCheckInCount={pendingCheckInCount}
        currentStage={currentStage}
        currentView={currentView}
        onToggleView={setCurrentView}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Content Column */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Integration Status Bar */}
        <div className="rounded-[6px] px-3.5 py-2.5 bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${firebaseReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="font-mono text-muted-foreground">
              Storage: <span className="text-foreground">{firebaseReady ? 'Firestore Cloud' : 'Local Storage'}</span> ({firebaseReady ? 'real-time sync' : 'offline fallback'})
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
            <span className={firebaseReady ? 'text-emerald-400' : 'text-amber-400'}>
              Firebase: {firebaseReady ? 'connected' : 'local mode'}
            </span>
            <span>•</span>
            <span className={supabaseReady ? 'text-emerald-400' : 'text-amber-400'}>
              Supabase: {supabaseReady ? 'connected' : 'local mode'}
            </span>
          </div>
        </div>

        {/* Hero Section: Skeleton or Loaded */}
        {isLoading ? (
          <RecommendationSkeleton />
        ) : (
          <RecommendationHero
            recommendation={recommendation}
            totalPosts={currentPosts.length}
            completedPosts={completedPosts.length}
            postType={activePostType}
            onUseSlot={handleUseRecommendedSlot}
          />
        )}

        {/* 24-Hour Performance Check-In Queue */}
        <CheckInQueue
          posts={currentPosts}
          onCheckInCompleted={() => setVersion(v => v + 1)}
        />

        {/* Performance Comparison */}
        <PerformanceComparison report={comparisonReport} />

        {/* Heatmap Matrix: Skeleton or Loaded */}
        {isLoading ? (
          <MatrixSkeleton />
        ) : (
          <HeatmapMatrix dayStats={matrixStats} />
        )}

        {/* Weekly External Signals Log */}
        <ExternalSignalsSection
          signals={externalSignals}
          onSignalAdded={() => setVersion(v => v + 1)}
        />

        {/* Post Timeline: Skeleton or Loaded */}
        {isLoading ? (
          <TimelineSkeleton />
        ) : (
          <PostTimeline
            posts={currentPosts}
            postType={activePostType}
          />
        )}

      </main>

      {/* Mobile Bottom Dock */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => setCurrentView('landing')}
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground font-mono text-[10px]"
        >
          <Compass className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={handleOpenQuickPost}
          className="h-10 px-5 rounded-[6px] bg-primary text-primary-foreground font-medium text-xs flex items-center gap-1.5 shadow active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Post</span>
        </button>

        <button
          onClick={() => setActivePostType(activePostType === 'public' ? 'trial' : 'public')}
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground font-mono text-[10px]"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{activePostType === 'public' ? 'To Trial' : 'To Public'}</span>
        </button>
      </div>

      {/* Quick Post Logging Modal */}
      <QuickPostModal
        isOpen={isQuickPostOpen}
        onClose={() => setIsQuickPostOpen(false)}
        defaultPostType={activePostType}
        defaultSlotSource={defaultSlotSource}
      />

      {/* Standard Legal Footer */}
      <LegalFooter onNavigate={setCurrentView} />

    </div>
  );
};
