import React, { useState } from 'react';
import { Plus, ExternalLink, Trash2, X } from 'lucide-react';
import { ExternalSignal } from '../types';
import { storageService } from '../services/storageService';
import { getStartOfWeekDate } from '../utils/dateUtils';

interface ExternalSignalsSectionProps {
  signals: ExternalSignal[];
  onSignalAdded: () => void;
}

export const ExternalSignalsSection: React.FC<ExternalSignalsSectionProps> = ({ signals, onSignalAdded }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weekOf, setWeekOf] = useState(getStartOfWeekDate());
  const [noteText, setNoteText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const handleAddSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    await storageService.addSignal({
      week_of: weekOf,
      note_text: noteText.trim(),
      source_url: sourceUrl.trim() || undefined,
    });

    setNoteText('');
    setSourceUrl('');
    setIsModalOpen(false);
    onSignalAdded();
  };

  const handleDelete = (signalId: string) => {
    storageService.deleteSignal(signalId);
    onSignalAdded();
  };

  return (
    <div className="rounded-[8px] bg-card border border-border p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="sec-label">External Signals Log</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {signals.length} notes
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log weekly algorithm shifts, audio trends, or shadow-ban reports
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="h-8 px-3 rounded-[6px] border border-input bg-transparent text-foreground hover:bg-accent text-xs font-medium active:scale-[0.99] transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Signal</span>
        </button>
      </div>

      {/* Signal list or empty state */}
      {signals.length === 0 ? (
        <div className="p-4 rounded-[6px] bg-secondary border border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>No external signals logged. Add weekly notes to correlate reach changes with platform events.</span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-foreground hover:underline font-mono text-xs"
          >
            Log first signal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {signals.map(s => (
            <div
              key={s.signal_id}
              className="p-3.5 rounded-[6px] bg-secondary border border-border flex flex-col justify-between gap-2.5 text-xs"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1">
                  <span>Week of {s.week_of}</span>
                  <button
                    onClick={() => handleDelete(s.signal_id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-foreground leading-normal font-sans">
                  {s.note_text}
                </p>
              </div>

              {s.source_url && (
                <div className="pt-2 border-t border-border flex items-center justify-end">
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[11px] bg-popover border border-border p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="sec-label">Log External Signal</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSignal} className="space-y-3.5">
              <div>
                <label className="sec-label text-[10px] block mb-1">
                  Week Starting Date
                </label>
                <input
                  type="date"
                  value={weekOf}
                  onChange={(e) => setWeekOf(e.target.value)}
                  className="w-full h-[34px] px-3 rounded-[6px] bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:border-ring"
                  required
                />
              </div>

              <div>
                <label className="sec-label text-[10px] block mb-1">
                  Observation / Event Note
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Major algorithm update prioritizing shares; creator reach suppressed across tech niche..."
                  rows={3}
                  className="w-full p-3 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="sec-label text-[10px] block mb-1">
                  Source Reference URL (Optional)
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-[34px] px-3 rounded-[6px] bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3 rounded-[6px] border border-input bg-transparent text-foreground hover:bg-accent text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-[6px] bg-primary text-primary-foreground font-medium text-xs hover:bg-[#e0e0e0] active:scale-[0.99] transition-all"
                >
                  Save Signal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
