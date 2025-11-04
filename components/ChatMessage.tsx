import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  };
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Avatar */}
      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-accent' : 'bg-card-bg border border-border'
      }`}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-accent" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-accent text-white'
            : 'bg-card-bg border border-border'
        }`}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 ml-4 list-disc space-y-1 text-sm">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 ml-4 list-decimal space-y-1 text-sm">{children}</ol>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block rounded bg-muted p-2 text-xs font-mono overflow-x-auto">
                        {children}
                      </code>
                    );
                  },
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Streaming Cursor */}
              {isStreaming && message.content && (
                <motion.span
                  className="inline-block h-3 w-1 bg-current ml-1"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Thinking Indicator */}
              {isStreaming && !message.content && (
                <div className="flex items-center gap-1 text-sm text-secondary">
                  <span>Thinking</span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1 w-1 rounded-full bg-secondary"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Timestamp */}
        <span className="mt-1 text-xs text-secondary">
          {new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </span>
      </div>
    </motion.div>
  );
}