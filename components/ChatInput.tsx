import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prefix: string;
}

// Slash-menu infrastructure is retained for future commands. Empty for now.
const SLASH_COMMANDS: SlashCommand[] = [];

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

  const handleMessageChange = (value: string) => {
    setMessage(value);
    const trimmed = value.trimStart();
    if (trimmed === '/' && SLASH_COMMANDS.length > 0) {
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
      <div className="relative">
        {/* Slash command menu */}
        {showSlashMenu && SLASH_COMMANDS.length > 0 && (
          <div
            ref={menuRef}
            className="absolute bottom-full left-0 mb-1.5 w-[min(calc(100vw-2rem),18rem)] rounded-lg border border-border bg-background shadow-lg overflow-hidden z-50"
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
              placeholder="Ask a question..."
              disabled={disabled}
              className="w-full resize-none rounded-lg border border-border bg-background pl-4 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-accent focus:ring-accent/20 disabled:opacity-50 scrollbar-hidden transition-colors"
              rows={1}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting || disabled}
            className="rounded-lg px-4 py-3 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 bg-accent hover:bg-accent-hover"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
