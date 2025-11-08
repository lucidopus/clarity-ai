'use client';

import { useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Simple rich text editor component
 * For MVP, using a styled textarea. Can be enhanced with proper rich text library later.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...'
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[300px] px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-vertical font-sans leading-relaxed"
      />
      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
        {value.length} characters
      </div>
    </div>
  );
}
