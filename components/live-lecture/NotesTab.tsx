'use client';

import { useRef, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useLiveLecture } from '@/lib/live-lecture/LiveLectureContext';

export default function NotesTab() {
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

  return (
    <div className="flex flex-col h-full">
      {/* Textarea */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={focusNotes}
          onChange={(e) => setFocusNotes(e.target.value)}
          placeholder={"Take notes during the lecture...\n\nPress ⌘K to mark a moment as important"}
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
    </div>
  );
}
