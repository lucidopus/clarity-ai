'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Lightbulb, Star, Sparkles, BookOpen, HelpCircle, ListChecks } from 'lucide-react';
import { useLiveLecture } from '@/lib/live-lecture/LiveLectureContext';

interface NotesTabProps {
  onAskClara?: () => void;
}

export default function NotesTab({ onAskClara }: NotesTabProps) {
  const { focusNotes, setFocusNotes, addMarker, markers } = useLiveLecture();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ⌘K / Ctrl+K to add importance marker
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const pos = textareaRef.current?.selectionStart;
        addMarker(pos ?? undefined);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [addMarker]);

  const handleExplainLast2Min = useCallback(() => {
    window.dispatchEvent(new CustomEvent('live-lecture-explain-last-2-min'));
    onAskClara?.();
  }, [onAskClara]);

  const sendQuickPrompt = useCallback((prompt: string) => {
    window.dispatchEvent(new CustomEvent('live-lecture-quick-prompt', { detail: prompt }));
    onAskClara?.();
  }, [onAskClara]);

  return (
    <div className="flex flex-col h-full">
      {/* Textarea */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={focusNotes}
          onChange={(e) => setFocusNotes(e.target.value)}
          placeholder="Take notes during the lecture...&#10;&#10;Press ⌘K to mark a moment as important"
          className="w-full h-full resize-none bg-transparent text-foreground text-sm leading-relaxed p-3 focus:outline-none placeholder:text-muted-foreground/40"
          spellCheck={false}
        />

        {/* Marker count badge */}
        {markers.length > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-xs">
            <Star className="w-3 h-3" />
            {markers.length}
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border/50 overflow-x-auto">
        <button
          onClick={handleExplainLast2Min}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Lightbulb className="w-3 h-3" />
          Explain Last 2 Min
        </button>
        <button
          onClick={() => sendQuickPrompt('Summarize everything covered so far in this lecture')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card-bg/80 border border-border/50 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Sparkles className="w-3 h-3" />
          Summarize
        </button>
        <button
          onClick={() => sendQuickPrompt('List the key terms and definitions mentioned in this lecture so far')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card-bg/80 border border-border/50 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <BookOpen className="w-3 h-3" />
          Key Terms
        </button>
        <button
          onClick={() => sendQuickPrompt('Generate 3 quick quiz questions based on what has been covered so far')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card-bg/80 border border-border/50 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <HelpCircle className="w-3 h-3" />
          Quiz Me
        </button>
        <button
          onClick={() => sendQuickPrompt('What are the key takeaways and action items from this lecture so far?')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card-bg/80 border border-border/50 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <ListChecks className="w-3 h-3" />
          Takeaways
        </button>
        <div className="ml-auto text-xs text-muted-foreground/50 shrink-0">
          ⌘K mark important
        </div>
      </div>
    </div>
  );
}
