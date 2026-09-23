import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { LegalFooter } from './LegalFooter';

interface PrivacyViewProps {
  onNavigate: (view: any) => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onNavigate }) => {
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
          <span className="sec-label">Privacy Policy</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6">
        
        <header className="space-y-1">
          <div className="sec-label">Legal</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tightest text-foreground">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-muted-foreground">Last updated: 2026 • Arigato Labs</p>
        </header>

        <div className="space-y-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          
          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">1. Who We Are</h2>
            <p>
              Time Matrix is a creator performance tracking and prediction application developed by <strong>Arigato Labs</strong>, founded by Kumar Devanshu. Contact: <a href="mailto:kumardevanshu3001@gmail.com" className="text-foreground hover:underline font-mono">kumardevanshu3001@gmail.com</a>.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">2. What We Collect</h2>
            <p>
              We collect information that you directly provide while using Time Matrix:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Publication timestamps and time-of-day buckets.</li>
              <li>Reel post type (Trial Reel vs. Public Post) and slot decision source (Algorithm vs. Manual).</li>
              <li>Verified 24-hour view counts that you record manually.</li>
              <li>Optional reel captions, hook notes, and thumbnail preview images.</li>
              <li>Weekly external trend observations (algorithm notes, audio news).</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">3. How We Use Data</h2>
            <p>
              Your data is exclusively used to operate the Time Matrix service: calculating descriptive metrics, computing recency-weighted scores, generating multi-armed bandit posting recommendations, and displaying comparison reports. We do not sell your personal data or user logs to third parties.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">4. Third-Party Service Providers</h2>
            <p>
              Time Matrix utilizes standard cloud infrastructure:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Google Firebase Firestore:</strong> Cloud database for storing post records, timestamps, and analytics data points.</li>
              <li><strong>Supabase Storage:</strong> Media bucket storage for uploaded reel thumbnail images.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">5. Storage & Retention</h2>
            <p>
              Your records are stored securely in Cloud Firestore and mirrored in local device storage for rapid offline PWA access. You maintain full ownership of your data and can delete individual posts at any time.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">6. Security</h2>
            <p>
              We enforce industry-standard security practices including encrypted SSL/TLS data transfer and strict Firestore security rules.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">7. Children</h2>
            <p>
              Time Matrix is not directed at children under the age of 13.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">8. Changes</h2>
            <p>
              We may update this policy periodically. Continued use of Time Matrix signifies acceptance of updated terms.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">9. Contact</h2>
            <p>
              For privacy inquiries, contact Kumar Devanshu at <a href="mailto:kumardevanshu3001@gmail.com" className="text-foreground hover:underline font-mono">kumardevanshu3001@gmail.com</a>.
            </p>
          </section>

        </div>

      </main>

      <LegalFooter onNavigate={onNavigate} />

    </div>
  );
};
