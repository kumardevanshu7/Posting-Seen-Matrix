import React from 'react';

interface LegalFooterProps {
  onNavigate: (view: any) => void;
}

export const LegalFooter: React.FC<LegalFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-border py-8 px-4 sm:px-8 mt-auto text-xs text-muted-foreground bg-background">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Navigation links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[11px]">
          <button 
            onClick={() => onNavigate('article')} 
            className="text-foreground font-semibold hover:underline transition-all flex items-center gap-1"
          >
            <span>Algorithm Article</span>
          </button>
          <span>·</span>
          <button 
            onClick={() => onNavigate('about')} 
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            About
          </button>
          <span>·</span>
          <button 
            onClick={() => onNavigate('privacy')} 
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </button>
          <span>·</span>
          <button 
            onClick={() => onNavigate('terms')} 
            className="hover:text-foreground transition-colors"
          >
            Terms
          </button>
          <span>·</span>
          <button 
            onClick={() => onNavigate('disclaimer')} 
            className="hover:text-foreground transition-colors"
          >
            Disclaimer
          </button>
          <span>·</span>
          <button 
            onClick={() => onNavigate('contact')} 
            className="hover:text-foreground transition-colors"
          >
            Contact
          </button>
          <span>·</span>
          <button 
            onClick={() => onNavigate('explore')} 
            className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <img src="/arigato-single-logo.png" alt="Arigato Labs" className="w-3.5 h-3.5 object-contain" />
            <span>Explore Arigato Labs</span>
          </button>
        </div>

        {/* Copyright notice */}
        <div className="text-center sm:text-right font-mono text-[11px] text-muted-foreground/80">
          <div>Copyright © 2026 Arigato Labs. All Rights Reserved.</div>
        </div>

      </div>
    </footer>
  );
};
