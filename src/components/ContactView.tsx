import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle2, Mail } from 'lucide-react';
import { LegalFooter } from './LegalFooter';

interface ContactViewProps {
  onNavigate: (view: any) => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');

    const structuredBody = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ARIGATO LABS · CONTACT
  Product: Time Matrix
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

From:     ${name.trim()}
Email:    ${email.trim()}
Subject:  ${subject.trim() || 'General Inquiry'}

Message
-------
${message.trim()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sent from Time Matrix contact form
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    try {
      const web3FormsKey = import.meta.env.VITE_WEB3FORMS_KEY || 'your_access_key';
      
      if (web3FormsKey && web3FormsKey !== 'your_access_key') {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: web3FormsKey,
            from_name: 'Arigato Labs · Time Matrix',
            name: name.trim(),
            email: email.trim(),
            subject: `[Time Matrix] ${subject.trim() || 'Contact Form Inquiry'}`,
            message: structuredBody,
          })
        });

        const data = await response.json();
        if (data.success) {
          setSubmitted(true);
        } else {
          throw new Error(data.message || 'Submission failed');
        }
      } else {
        // Fallback: Opens pre-formatted email in default client to founder
        const mailtoUrl = `mailto:kumardevanshu3001@gmail.com?subject=${encodeURIComponent('[Time Matrix] ' + (subject.trim() || 'Inquiry'))}&body=${encodeURIComponent(structuredBody)}`;
        window.location.href = mailtoUrl;
        setSubmitted(true);
      }
    } catch (err: any) {
      console.warn('Contact form error, providing mailto fallback:', err);
      const mailtoUrl = `mailto:kumardevanshu3001@gmail.com?subject=${encodeURIComponent('[Time Matrix] ' + (subject.trim() || 'Inquiry'))}&body=${encodeURIComponent(structuredBody)}`;
      window.location.href = mailtoUrl;
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <span className="sec-label">Contact</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6">
        
        <header className="space-y-1">
          <div className="sec-label">Get in Touch</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tightest text-foreground">
            Contact Arigato Labs
          </h1>
          <p className="text-xs text-muted-foreground">
            Questions about Time Matrix or Arigato Labs? Send a message — it goes directly to the founder.
          </p>
        </header>

        {submitted ? (
          <div className="p-6 rounded-[8px] bg-secondary border border-border text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-foreground mx-auto" />
            <h2 className="text-sm font-semibold text-foreground">Message sent</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We’ll get back to you by email at <strong>{email}</strong> shortly.
            </p>
            <button
              onClick={() => { setSubmitted(false); setMessage(''); setSubject(''); }}
              className="font-mono text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 pt-2"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="sec-label text-[10px] block mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full h-[34px] px-3 rounded-[6px] bg-card border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                />
              </div>

              <div>
                <label className="sec-label text-[10px] block mb-1">
                  Your Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full h-[34px] px-3 rounded-[6px] bg-card border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                />
              </div>
            </div>

            <div>
              <label className="sec-label text-[10px] block mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Inquiry about Time Matrix features..."
                className="w-full h-[34px] px-3 rounded-[6px] bg-card border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring"
              />
            </div>

            <div>
              <label className="sec-label text-[10px] block mb-1">
                Message *
              </label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you?"
                className="w-full p-3 rounded-[6px] bg-card border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none leading-relaxed"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-destructive font-mono">{errorMsg}</p>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span>Direct: kumardevanshu3001@gmail.com</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-8 px-4 rounded-[6px] bg-primary text-primary-foreground font-medium text-xs hover:bg-[#e0e0e0] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sending...' : 'Send message'}</span>
              </button>
            </div>

          </form>
        )}

      </main>

      <LegalFooter onNavigate={onNavigate} />

    </div>
  );
};
