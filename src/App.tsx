import React, { useState, useEffect } from 'react';
import { PostType, SlotSource, TimeSlotRecommendation, UserProfile } from './types';
import { storageService } from './services/storageService';
import { userService } from './services/userService';
import { generateRecommendation, computeMatrixStats, computeComparisonReport, getEngineStage } from './services/predictionEngine';
import { Header } from './components/Header';
import { RecommendationHero } from './components/RecommendationHero';
import { CheckInQueue } from './components/CheckInQueue';
import { PerformanceComparison } from './components/PerformanceComparison';
import { HeatmapMatrix } from './components/HeatmapMatrix';
import { ExternalSignalsSection } from './components/ExternalSignalsSection';
import { PostTimeline } from './components/PostTimeline';
import { QuickPostModal } from './components/QuickPostModal';
import { SmartSlotModal } from './components/SmartSlotModal';
import { SmartSlot } from './services/slotDistributionEngine';
import { OnboardingModal } from './components/OnboardingModal';
import { LandingView } from './components/LandingView';
import { ExploreView } from './components/ExploreView';
import { AboutView } from './components/AboutView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { DisclaimerView } from './components/DisclaimerView';
import { ContactView } from './components/ContactView';
import { ArticleView } from './components/ArticleView';
import { LegalFooter } from './components/LegalFooter';
import { RecommendationSkeleton, MatrixSkeleton, TimelineSkeleton } from './components/SkeletonLoader';
import { isFirebaseConfigured, subscribeToAuth, logout } from './config/firebase';
import { isSupabaseConfigured } from './config/supabase';
import { User } from 'firebase/auth';
import { Plus, LayoutDashboard, Compass, Zap, BookOpen } from 'lucide-react';

export const App: React.FC = () => {
  const [activePostType, setActivePostType] = useState<PostType>('public');
  const [currentView, setCurrentView] = useState<'app' | 'landing' | 'explore' | 'about' | 'privacy' | 'terms' | 'disclaimer' | 'contact' | 'article'>(() => {
    return localStorage.getItem('time_matrix_authed') === 'true' ? 'app' : 'landing';
  });
  const [isQuickPostOpen, setIsQuickPostOpen] = useState(false);
  const [isSmartSlotOpen, setIsSmartSlotOpen] = useState(false);
  const [initialSlotTimeUTC, setInitialSlotTimeUTC] = useState<string | undefined>(undefined);
  const [initialSlotTitle, setInitialSlotTitle] = useState<string | undefined>(undefined);
  const [defaultSlotSource, setDefaultSlotSource] = useState<SlotSource>('user');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setVersion] = useState(0);

  // Subscribe to Firebase Auth changes & check onboarding status
  useEffect(() => {
    const unsubAuth = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user) {
        localStorage.setItem('time_matrix_authed', 'true');
        setCurrentView(prev => prev === 'landing' ? 'app' : prev);

        // Optimistic zero-latency display from local cache
        const cached = userService.getCachedProfile(user.uid);
        if (cached) {
          setUserProfile(cached);
          if (cached.onboarding_completed) {
            setIsOnboardingOpen(false);
          }
        }

        try {
          // Fresh fetch from Cloud Firestore (stale-while-revalidate)
          const profile = await userService.getUserProfile(user.uid);
          setUserProfile(profile);
          if (!profile || !profile.onboarding_completed) {
            setIsOnboardingOpen(true);
          } else {
            setIsOnboardingOpen(false);
          }
        } catch (e) {
          console.error('Error checking profile:', e);
          if (!cached || !cached.onboarding_completed) {
            setIsOnboardingOpen(true);
          }
        }
      } else {
        localStorage.removeItem('time_matrix_authed');
        setUserProfile(null);
        setIsOnboardingOpen(false);
        setCurrentView('landing');
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
    setInitialSlotTimeUTC(undefined);
    setInitialSlotTitle(undefined);
    setIsQuickPostOpen(true);
  };

  const handleUseRecommendedSlot = (_slot: TimeSlotRecommendation) => {
    setDefaultSlotSource('algorithm');
    setInitialSlotTimeUTC(undefined);
    setInitialSlotTitle(undefined);
    setIsQuickPostOpen(true);
  };

  const handleSelectSmartSlot = (slot: SmartSlot, postType: PostType) => {
    setActivePostType(postType);
    setDefaultSlotSource('algorithm');
    setInitialSlotTimeUTC(slot.timestampUTC);
    setInitialSlotTitle(`${postType === 'trial' ? 'Trial' : 'Public'} Reel (${slot.timeIST})`);
    setIsSmartSlotOpen(false);
    setIsQuickPostOpen(true);
  };

  const handleSignOut = async () => {
    localStorage.removeItem('time_matrix_authed');
    await logout();
    setCurrentView('landing');
  };

  const firebaseReady = isFirebaseConfigured();
  const supabaseReady = isSupabaseConfigured();

  // Route Views
  if (currentView === 'landing') {
    return <LandingView onEnterApp={() => setCurrentView('app')} currentUser={currentUser} onNavigate={setCurrentView} />;
  }
  if (currentView === 'article') {
    return <ArticleView onNavigate={setCurrentView} />;
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
        onOpenSmartSlots={() => setIsSmartSlotOpen(true)}
        publicCount={publicPosts.length}
        trialCount={trialPosts.length}
        pendingCheckInCount={pendingCheckInCount}
        currentStage={currentStage}
        currentView={currentView}
        onToggleView={setCurrentView}
        currentUser={currentUser}
        userProfile={userProfile}
        onEditProfile={() => setIsOnboardingOpen(true)}
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
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setCurrentView('article')}
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground font-mono text-[10px]"
          title="The Science & Architecture of Time Matrix"
        >
          <BookOpen className="w-4 h-4" />
          <span>Article</span>
        </button>

        <button
          onClick={() => setIsSmartSlotOpen(true)}
          className="flex flex-col items-center gap-0.5 text-amber-400 hover:text-amber-300 font-mono text-[10px]"
          title="Smart Posting Timings"
        >
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          <span className="font-semibold text-foreground">Timings</span>
        </button>

        <button
          onClick={handleOpenQuickPost}
          className="h-9 px-3.5 rounded-[6px] bg-primary text-primary-foreground font-medium text-xs flex items-center gap-1 shadow active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>

        <button
          onClick={() => setActivePostType(activePostType === 'public' ? 'trial' : 'public')}
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground font-mono text-[10px]"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{activePostType === 'public' ? 'To Trial' : 'To Public'}</span>
        </button>
      </div>

      {/* Smart Daily Slot Distribution Modal */}
      <SmartSlotModal
        isOpen={isSmartSlotOpen}
        onClose={() => setIsSmartSlotOpen(false)}
        posts={currentPosts}
        initialPostType={activePostType}
        onSelectSlot={handleSelectSmartSlot}
      />

      {/* Quick Post Logging Modal */}
      <QuickPostModal
        isOpen={isQuickPostOpen}
        onClose={() => {
          setIsQuickPostOpen(false);
          setInitialSlotTimeUTC(undefined);
          setInitialSlotTitle(undefined);
        }}
        defaultPostType={activePostType}
        defaultSlotSource={defaultSlotSource}
        initialTimestampUTC={initialSlotTimeUTC}
        initialTitle={initialSlotTitle}
      />

      {/* First-time Creator Onboarding Modal */}
      {currentUser && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          currentUser={currentUser}
          initialProfile={userProfile}
          onComplete={(profile) => {
            setUserProfile(profile);
            setIsOnboardingOpen(false);
            setCurrentView('app');
          }}
        />
      )}

      {/* Standard Legal Footer */}
      <LegalFooter onNavigate={setCurrentView} />

    </div>
  );
};
