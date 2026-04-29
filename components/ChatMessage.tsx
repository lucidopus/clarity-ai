import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, User } from 'lucide-react';
import type { ToolEvent } from '@/hooks/useChatBot';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import {
  tryParseCalloutSpec,
  tryParseComparisonSpec,
} from '@/lib/types/visualization';

// Lazy-load visualization renderers — Mermaid alone is ~200kb, no point
// shipping it (or the card primitives) until a chat actually contains a
// fenced visualization block.
const MermaidRenderer = dynamic(
  () => import('@/components/chat/MermaidRenderer'),
  { ssr: false },
);
const Callout = dynamic(() => import('@/components/chat/Callout'), {
  ssr: false,
});
const ComparisonCard = dynamic(
  () => import('@/components/chat/ComparisonCard'),
  { ssr: false },
);

/** Pulsing dots — reused by both the Thinking indicator and timeline items. */
function PulsingDots({ className = 'bg-secondary' }: { className?: string }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`h-1 w-1 rounded-full ${className}`}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/**
 * Vertical timeline of tool calls + a persistent "Thinking" indicator at the bottom.
 * Each completed tool shows a check, active tools show a pulsing dot.
 */
function ToolActivityTimeline({ events }: { events: ToolEvent[] }) {
  return (
    <div className="flex flex-col gap-0">
      {/* Tool timeline */}
      <div className="flex flex-col">
        <AnimatePresence mode="popLayout">
          {events.map((evt, i) => (
            <motion.div
              key={`${evt.tool}-${i}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-center gap-2 py-0.5"
            >
              {/* Timeline dot */}
              {evt.status === 'done' ? (
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              ) : (
                <motion.div
                  className="h-1.5 w-1.5 rounded-full bg-accent shrink-0"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
              <span className={`text-xs ${
                evt.status === 'done' ? 'text-secondary/70' : 'text-secondary'
              }`}>
                {evt.label}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Thinking indicator — always visible */}
      <div className="flex items-center gap-1 text-sm text-secondary mt-1">
        <span>Thinking</span>
        <PulsingDots />
      </div>
    </div>
  );
}

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    toolEvents?: ToolEvent[];
  };
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Check initially
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Custom syntax highlighting style that removes backgrounds
  const getCodeStyle = (baseStyle: Record<string, unknown>) => {
    return {
      ...baseStyle,
      'pre[class*="language-"]': {
        ...((baseStyle['pre[class*="language-"]'] as Record<string, unknown>) || {}),
        background: 'transparent',
        margin: 0,
      },
      'code[class*="language-"]': {
        ...((baseStyle['code[class*="language-"]'] as Record<string, unknown>) || {}),
        background: 'transparent',
      },
    };
  };

  return (
    <motion.div
      data-message-id={message.id}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Avatar */}
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
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
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  // Headings
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mb-3 mt-2 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-sm font-semibold mb-2 mt-2 first:mt-0">{children}</h4>
                  ),

                  // Paragraphs
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0 text-sm leading-relaxed text-foreground/90">{children}</p>
                  ),

                  // Lists with better spacing
                  ul: ({ children }) => (
                    <ul className="mb-3 ml-5 list-disc space-y-2 text-sm marker:text-accent/70">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 ml-5 list-decimal space-y-2 text-sm marker:text-accent/70">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed pl-1">{children}</li>
                  ),

                  // Code blocks: visualization fences first, then syntax highlighting
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                  code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    // While streaming, show a "composing" placeholder for the
                    // JSON-payload primitives so the user never sees raw JSON
                    // flash before snap-replacing with a polished card. Mermaid
                    // is exempt — its diagram source is human-readable mid-stream
                    // and gives useful "Clara is drafting a diagram" feedback.
                    if (!inline && isStreaming && (language === 'callout' || language === 'compare')) {
                      const composingLabel = language === 'callout' ? 'callout' : 'comparison';
                      return (
                        <div
                          className="my-3 rounded-md border border-border/40 bg-muted/20 px-3.5 py-3 flex items-center gap-2"
                          role="status"
                          aria-busy="true"
                        >
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="h-1 w-1 rounded-full bg-secondary animate-pulse"
                                style={{ animationDelay: `${i * 200}ms` }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-secondary">Composing {composingLabel}…</span>
                        </div>
                      );
                    }

                    // Visualization fences — only on completed (non-streaming) blocks.
                    // During streaming, fall through to the syntax highlighter so the
                    // user sees text accumulating (Mermaid) or a placeholder (above)
                    // instead of a flickering empty card.
                    if (!inline && !isStreaming) {
                      const raw = String(children).replace(/\n$/, '');

                      if (language === 'mermaid') {
                        return <MermaidRenderer source={raw} />;
                      }

                      if (language === 'callout') {
                        const spec = tryParseCalloutSpec(raw);
                        if (spec) return <Callout {...spec} />;
                        // Fall through to default code-block render on parse failure.
                      }

                      if (language === 'compare') {
                        const spec = tryParseComparisonSpec(raw);
                        if (spec) return <ComparisonCard {...spec} />;
                      }
                    }

                    return !inline && language ? (
                      <div className="my-3 rounded-md overflow-hidden border border-border/30">
                        <div className="bg-muted/30 px-3 py-1.5 text-xs font-mono text-secondary border-b border-border/30 flex items-center justify-between">
                          <span>{language}</span>
                        </div>
                        <div className="relative bg-black/2 dark:bg-white/2">
                          <SyntaxHighlighter
                            style={getCodeStyle(isDarkMode ? oneDark : oneLight)}
                            language={language}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              padding: '14px',
                              fontSize: '13px',
                              lineHeight: '1.6',
                              background: 'transparent',
                            }}
                            codeTagProps={{
                              style: {
                                background: 'transparent',
                                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                              }
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    ) : (
                      <code className="rounded bg-accent/10 px-1.5 py-0.5 text-xs font-mono text-accent dark:bg-accent/20 border border-accent/20 dark:border-accent/30">
                        {children}
                      </code>
                    );
                  },

                  // Emphasis and strong
                  em: ({ children }) => (
                    <em className="italic text-foreground">{children}</em>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),

                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-accent/50 pl-4 py-1 my-3 italic text-secondary">
                      {children}
                    </blockquote>
                  ),

                  // Horizontal rules
                  hr: () => (
                    <hr className="my-4 border-t border-border/50" />
                  ),

                  // Links
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline font-medium"
                    >
                      {children}
                    </a>
                  ),

                  // Pre (code block wrapper)
                  pre: ({ children }) => (
                    <div className="my-3">{children}</div>
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

              {/* Thinking / Tool Activity Indicator */}
              {isStreaming && !message.content && (
                message.toolEvents && message.toolEvents.length > 0 ? (
                  <ToolActivityTimeline events={message.toolEvents} />
                ) : (
                  <ThinkingIndicator />
                )
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
