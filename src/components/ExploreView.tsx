import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LegalFooter } from './LegalFooter';

interface ExploreViewProps {
  onNavigate: (view: any) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ onNavigate }) => {
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

          <span className="sec-label">
            Explore Arigato Labs
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center space-y-10">
        
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tightest text-foreground">
            Our Company
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Redefining creator analytics and performance optimization for the modern era.
          </p>
        </header>

        {/* Large Logo Display */}
        <div className="flex justify-center items-center py-2">
          <img 
            src="/arigato-labs-logo.png" 
            alt="Arigato Labs Logo" 
            className="max-w-[480px] sm:max-w-[560px] w-full object-contain filter invert contrast-125" 
          />
        </div>

        {/* Founder & Mission Text */}
        <div className="space-y-6 max-w-xl mx-auto">
          
          {/* Founder Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[5px] bg-secondary border border-border text-xs font-mono text-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
            <span>Verified Founder</span>
          </div>

          <p className="text-sm text-foreground leading-relaxed">
            <strong>Time Matrix</strong> is proudly developed by <strong>Kumar Devanshu</strong>, founder of <strong>Arigato Labs</strong> in 2026.
          </p>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Our mission is to build sleek, modern, and high-performance tools that empower individuals and teams to achieve their goals with elegance and ease. We believe software should feel natural, fast, and distinctly beautiful.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('contact')}
              className="h-8 px-4 rounded-[6px] bg-primary text-primary-foreground text-xs font-medium hover:bg-[#e0e0e0] active:scale-[0.99] transition-all"
            >
              Get in Touch
            </button>
          </div>

        </div>

      </main>

      <LegalFooter onNavigate={onNavigate} />

    </div>
  );
};
