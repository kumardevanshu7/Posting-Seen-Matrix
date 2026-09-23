import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { LegalFooter } from './LegalFooter';

interface AboutViewProps {
  onNavigate: (view: any) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Top Bar */}
      <div className="border-b border-border py-3 px-4 sm:px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('app')}
            className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Time Matrix</span>
          </button>
          <span className="sec-label">About</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        
        <header className="space-y-1">
          <div className="sec-label">Company & Product</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tightest text-foreground">
            About Arigato Labs
          </h1>
        </header>

        <div className="space-y-5 text-sm text-foreground/90 leading-relaxed font-sans">
          <p>
            <strong>Time Matrix</strong> is a dedicated creator intelligence product of <strong>Arigato Labs</strong>.
          </p>

          <p>
            Built by <strong>Kumar Devanshu</strong>, founder of Arigato Labs (2026).
          </p>

          <div className="p-4 rounded-[6px] bg-secondary border border-border space-y-2">
            <div className="sec-label text-[10px]">Our Mission</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We build sleek, modern, high-performance tools that help people get things done with clarity and calm. Software should feel fast, natural, and carefully designed.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Time Matrix addresses the noisy, opaque nature of short-form video publishing algorithms. By enforcing strict 24-hour verification loops and training lightweight contextual multi-armed bandits, creators discover reproducible posting windows with mathematical confidence.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('contact')}
              className="h-8 px-4 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all"
            >
              Contact Founder
            </button>
          </div>
        </div>

      </main>

      <LegalFooter onNavigate={onNavigate} />

    </div>
  );
};
