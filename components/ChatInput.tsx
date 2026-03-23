import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prefix: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'visualize',
    label: '/visualize',
    description: 'Generate an interactive math animation',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    prefix: '/visualize ',
  },
];

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isVisualizeMode = useMemo(
    () => message.trimStart().toLowerCase().startsWith('/visualize'),
    [message]
  );

  const handleMessageChange = (value: string) => {
    setMessage(value);
    const trimmed = value.trimStart();
    if (trimmed === '/') {
      setShowSlashMenu(true);
      setSelectedIndex(0);
    } else if (!trimmed.startsWith('/') || trimmed.includes(' ')) {
      setShowSlashMenu(false);
    }
  };

  // Close menu on outside click
  useEffect(() => {
    if (!showSlashMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSlashMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSlashMenu]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const selectCommand = useCallback((cmd: SlashCommand) => {
    setMessage(cmd.prefix);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!message.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    setShowSlashMenu(false);
    await onSend(message.trim());
    setMessage('');
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, SLASH_COMMANDS.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectCommand(SLASH_COMMANDS[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Muted /visualize tip — only when input is empty */}
      {!message && !disabled && (
        <p className="text-[11px] text-secondary/40 pl-1 pb-0.5">
          Type <span className="font-mono text-purple-400/50">/visualize</span> to generate an interactive animation
        </p>
      )}

      {/* Visualize mode indicator */}
      {isVisualizeMode && (
        <div className="flex items-center gap-1.5 pl-1 pb-0.5 text-xs text-purple-500 dark:text-purple-400">
          <Sparkles className="h-3 w-3" />
          <span>Visualize mode — Clara will generate an animation</span>
        </div>
      )}

      <div className="relative">
        {/* Slash command menu */}
        {showSlashMenu && (
          <div
            ref={menuRef}
            className="absolute bottom-full left-0 mb-1.5 w-72 rounded-lg border border-border bg-background shadow-lg overflow-hidden z-50"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-secondary/50">
              Commands
            </div>
            {SLASH_COMMANDS.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => selectCommand(cmd)}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors cursor-pointer ${
                  i === selectedIndex
                    ? 'bg-purple-50 dark:bg-purple-500/10'
                    : 'hover:bg-card-bg'
                }`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  i === selectedIndex
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
                    : 'bg-card-bg text-secondary'
                }`}>
                  {cmd.icon}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-medium ${
                    i === selectedIndex ? 'text-purple-700 dark:text-purple-300' : 'text-foreground'
                  }`}>
                    {cmd.label}
                  </div>
                  <div className="text-xs text-secondary truncate">{cmd.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isVisualizeMode ? 'Describe what to visualize...' : 'Ask a question...'}
              disabled={disabled}
              className={`w-full resize-none rounded-lg border bg-background pl-4 pr-16 py-3 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 scrollbar-hidden transition-colors ${
                isVisualizeMode
                  ? 'border-purple-400 focus:border-purple-500 focus:ring-purple-500/20 dark:border-purple-500 dark:focus:border-purple-400'
                  : 'border-border focus:border-accent focus:ring-accent/20'
              }`}
              rows={1}
            />
            {/* Subtle "/" hint inside the input */}
            {!message && !disabled && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="inline-flex h-5 items-center rounded border border-border/60 bg-card-bg px-1.5 font-mono text-[10px] text-secondary/40">
                  /
                </kbd>
              </div>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting || disabled}
            className={`rounded-lg px-4 py-3 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 ${
              isVisualizeMode
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isVisualizeMode ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
