import React from 'react';
import { 
  ArrowLeft, 
  Clock, 
  BarChart3, 
  ShieldCheck, 
  Compass, 
  TrendingUp, 
  Zap, 
  Calendar,
  AlertTriangle,
  Layers,
  BookOpen
} from 'lucide-react';
import { LegalFooter } from './LegalFooter';

interface ArticleViewProps {
  onNavigate: (view: any) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#262626] selection:text-[#ffffff]">
      
      {/* Sticky Top Header */}
      <div className="border-b border-border py-3 px-4 sm:px-8 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('app')}
            className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Time Matrix</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="sec-label">Publication</span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="font-mono text-[11px] text-muted-foreground">Arigato Labs</span>
          </div>
        </div>
      </div>

      {/* Main Reading Column */}
      <article className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">
        
        {/* Article Title & Metadata Header */}
        <header className="space-y-4 border-b border-border pb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[5px] bg-secondary border border-border text-[11px] font-mono text-foreground">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Algorithm Architecture & Empirical Science</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tightest text-foreground leading-[1.15]">
            The Science of Time Matrix: How Short-Form Video Algorithms Actually Work
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            A comprehensive breakdown of multi-armed bandits, anti-cannibalization buffers, median-weighted scoring, and why generic "Best Time to Post" advice destroys creator reach.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs text-muted-foreground">
            <span>By Arigato Labs</span>
            <span>•</span>
            <span>Indian Standard Time (IST) Architecture</span>
            <span>•</span>
            <span>12 min read</span>
          </div>
        </header>

        {/* Section 1: The Fatal Flaw in Conventional Guru Advice */}
        <section className="space-y-4">
          <div className="sec-label text-[10px]">Part 01 • The Fundamental Problem</div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Why Generic "Best Time to Post" Advice Fails
          </h2>
          
          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
            If you search online for the best time to post an Instagram Reel, you will find hundreds of colorful infographics claiming that <em>"Wednesday at 11:00 AM"</em> or <em>"Friday at 7:00 PM"</em> is universal truth.
          </p>

          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
            In reality, these generic schedules are mathematically useless for two primary reasons:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-[8px] bg-secondary/60 border border-border space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Audience Demographics Shift</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A fitness creator’s audience checks their feed at 6:00 AM before workouts. A developer or gamer audience scrolls at 11:30 PM. Universal schedules force everyone into the same average, destroying initial velocity.
              </p>
            </div>

            <div className="p-4 rounded-[8px] bg-secondary/60 border border-border space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>The Arithmetic Mean Trap</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an account posts 9 reels that get 2,000 views, and 1 viral reel that gets 200,000 views, the <em>average</em> is 21,800. But the creator cannot expect 21,800! Average over-indexes on freak anomalies.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: The Three Evolutionary Engine Stages */}
        <section className="space-y-4">
          <div className="sec-label text-[10px]">Part 02 • Core Mathematical Architecture</div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            The Three Evolutionary Engine Stages
          </h2>

          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
            Time Matrix does not guess. It evolves its mathematical model through three distinct statistical stages as your publication history grows:
          </p>

          <div className="space-y-4 pt-2">
            
            {/* Stage 1 */}
            <div className="p-4 rounded-[8px] bg-secondary/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  Stage 01 • Descriptive Median Analysis (0–14 Completed Posts)
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">Cold Start</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                In the cold-start phase, sample sizes are small. The engine calculates the true <strong>Median 24-Hour Views</strong> for each day-of-week and time bucket. By ranking on median rather than mean, a single viral video cannot falsely convince the engine that a dead time slot is a goldmine.
              </p>
            </div>

            {/* Stage 2 */}
            <div className="p-4 rounded-[8px] bg-secondary/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Stage 02 • Recency-Weighted Scoring + Outlier Capping (15–29 Posts)
                </span>
                <span className="font-mono text-[10px] text-emerald-400">Growth Calibration</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Instagram’s distribution algorithms change constantly. A reel posted 3 months ago is less predictive than a reel posted last week. Stage 2 applies an exponential decay weighting:
              </p>
              <div className="p-2.5 rounded bg-background border border-border font-mono text-xs text-center text-foreground">
                Weight = exp(-0.02 × daysAgo)
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Simultaneously, viral outliers are detected via Median Absolute Deviation (MAD) and capped at <code>max(median × 3, 5000)</code> views. This ensures the recency score reflects reliable audience habits rather than one-off algorithm lottery tickets.
              </p>
            </div>

            {/* Stage 3 */}
            <div className="p-4 rounded-[8px] bg-secondary/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-semibold text-foreground flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  Stage 03 • Contextual Multi-Armed Bandit (30+ Posts)
                </span>
                <span className="font-mono text-[10px] text-amber-400">Autonomous Optimization</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Once statistical significance is reached, the engine transitions to an Upper Confidence Bound (<strong>UCB1</strong>) Multi-Armed Bandit. This solves the famous <em>Exploration vs. Exploitation</em> dilemma:
              </p>
              <div className="p-2.5 rounded bg-background border border-border font-mono text-xs text-center text-foreground">
                Score(slot) = EstimatedReward(slot) + c × √( ln(N) / n_slot )
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If a slot has never been tested (e.g. Sunday afternoon), its uncertainty bonus forces an exploration experiment. When a slot is chosen purely for exploration, Time Matrix explicitly tags it with an <strong>Exploration Window</strong> badge in the UI.
              </p>
            </div>

          </div>
        </section>

        {/* Section 3: Anti-Cannibalization Spacing */}
        <section className="space-y-4">
          <div className="sec-label text-[10px]">Part 03 • Posting Dynamics</div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            The Physics of Anti-Cannibalization: Trial vs. Public
          </h2>

          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
            One of the fastest ways to kill account reach is posting two videos too close together. Instagram’s distribution pipeline tests every new reel on an initial seed audience of your most active followers. If you post a second video 30 minutes later, the algorithm cuts off the impressions of the first video to deliver the second.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-[8px] bg-card border border-border space-y-2">
              <div className="font-mono text-xs font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-foreground" />
                <span>Option A • Trial Reels (50m Buffer)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trial reels test new hooks, formats, and audio. Because these reels are experimental, a 50-minute buffer gives the initial engagement loop enough room to gather seed signals without delaying subsequent tests.
              </p>
            </div>

            <div className="p-4 rounded-[8px] bg-card border border-border space-y-2">
              <div className="font-mono text-xs font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Option B • Trial to Public (80m Buffer)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When a reel is graduated to Public, it must reach maximum non-follower recommendation feeds (Explore & Reels Tab). An 80-minute minimum buffer protects the reel’s exponential distribution wave from being aborted early.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Remainder-Day Smart Distribution Algorithm */}
        <section className="space-y-4">
          <div className="sec-label text-[10px]">Part 04 • The Scheduler Engine</div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Remainder-Day Proportional Zone Partitioning
          </h2>

          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
            When you open the <strong>Smart Timings</strong> modal (e.g. at 4:18 PM IST) and request 4 reels today, our engine doesn't just pick the top 4 times from the morning. It computes:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-foreground/90 leading-relaxed pl-2 font-mono">
            <li><strong>Strict Future Anchor</strong>: Anchors strictly to the current IST minute (with a 25-minute buffer so you have time to upload).</li>
            <li><strong>Dead-Zone Suppression</strong>: Enforces a 23:50 IST cutoff to strictly prevent posting into the 1:00 AM – 5:00 AM audience dead zone.</li>
            <li><strong>Proportional Zone Partitioning</strong>: Divides remaining evening hours into 4 balanced strategic zones.</li>
            <li><strong>Natural Minute Snapping</strong>: Snaps to high-converting natural minute windows (e.g. 5:15 PM, 8:25 PM, 10:15 PM, 11:45 PM).</li>
            <li><strong>Graceful Spillover</strong>: If you request 4 reels at 10:30 PM, the engine fits what it safely can today and schedules the rest for tomorrow's highest retention windows.</li>
          </ol>
        </section>

        {/* Section 5: The 24-Hour Golden Rule & Data Integrity */}
        <section className="space-y-4">
          <div className="sec-label text-[10px]">Part 05 • Methodology Rigor</div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            The 24-Hour Verification Standard & Historical Backfills
          </h2>

          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
            Why does Time Matrix measure exactly 24-hour views instead of 7-day or 30-day views?
          </p>

          <div className="p-4 rounded-[8px] bg-secondary/50 border border-border space-y-3">
            <p className="text-xs text-foreground leading-relaxed">
              <strong>The 24-Hour Velocity Metric:</strong> In modern recommendation algorithms, the first 24 hours determine 85% of a video's lifetime trajectory. Measuring at 24 hours creates an apples-to-apples benchmark that removes confounding variables like search SEO or account follower growth.
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Historical Backfills:</strong> For creators who already have existing reel performance data, Time Matrix provides a dedicated Historical Backfill mode. By entering your original IST date, time, and 24-hour views, your Heatmap Matrix and prediction engine immediately calibrate with real empirical truth.
            </p>
          </div>
        </section>

        {/* CTA Box */}
        <div className="p-6 rounded-[10px] bg-card border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Ready to find your personal posting matrix?
            </h3>
            <p className="text-xs text-muted-foreground">
              Jump straight into your creator console and log your first reel or smart timing recommendation.
            </p>
          </div>

          <button
            onClick={() => onNavigate('app')}
            className="h-9 px-4 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all shrink-0 cursor-pointer"
          >
            Launch Time Matrix Console
          </button>
        </div>

      </article>

      {/* Footer */}
      <LegalFooter onNavigate={onNavigate} />

    </div>
  );
};
