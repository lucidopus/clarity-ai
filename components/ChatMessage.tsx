import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
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

                  // Code blocks with syntax highlighting
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                  code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    return !inline && language ? (
                      <div className="my-3 rounded-md overflow-hidden border border-border/30">
                        <div className="bg-muted/30 px-3 py-1.5 text-xs font-mono text-secondary border-b border-border/30 flex items-center justify-between">
                          <span>{language}</span>
                        </div>
                        <div className="relative bg-black/[0.02] dark:bg-white/[0.02]">
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
