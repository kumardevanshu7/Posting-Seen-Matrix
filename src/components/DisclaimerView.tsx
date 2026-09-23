import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { LegalFooter } from './LegalFooter';

interface DisclaimerViewProps {
  onNavigate: (view: any) => void;
}

export const DisclaimerView: React.FC<DisclaimerViewProps> = ({ onNavigate }) => {
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
          <span className="sec-label">Disclaimer</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6">
        
        <header className="space-y-1">
          <div className="sec-label">Legal</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tightest text-foreground">
            Disclaimer
          </h1>
          <p className="text-xs font-mono text-muted-foreground">Effective: 2026 • Arigato Labs</p>
        </header>

        <div className="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Time Matrix</strong> and all accompanying materials are provided on an <strong>“as is” and “as available”</strong> basis without warranties of any kind, whether express or implied.
          </p>

          <p>
            <strong>Arigato Labs</strong> and founder Kumar Devanshu are not liable for any loss of views, followers, account reach, profits, or damages arising out of the use or inability to use this application, to the maximum extent permitted by applicable law.
          </p>

          <p>
            Statistical posting time suggestions and multi-armed bandit predictions are purely <strong>analytical helpers</strong> derived from past observations. They do not constitute guaranteed outcomes or professional advisory services.
          </p>

          <p>
            Third-party platforms and services—including Instagram, Meta Platforms, Google Firebase, and Supabase—operate independently under their respective terms and privacy policies. Time Matrix is not affiliated with or endorsed by Instagram or Meta Platforms, Inc.
          </p>

          <div className="pt-4 border-t border-border font-mono text-xs text-foreground">
            Copyright © 2026 Arigato Labs. All Rights Reserved.
          </div>
        </div>

      </main>

      <LegalFooter onNavigate={onNavigate} />

    </div>
  );
};
