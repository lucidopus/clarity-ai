'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useLiveLecture } from '@/lib/live-lecture/LiveLectureContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ClaraTabProps {
  syncToServer: () => Promise<void>;
  partialText: string;
}

export default function ClaraTab({ syncToServer, partialText }: ClaraTabProps) {
  const { sessionId, incrementQuestionCount } = useLiveLecture();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing chat history (for resumed sessions)
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chatbot/history?channel=live_lecture&contextId=${sessionId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.messages && data.messages.length > 0 && !cancelled) {
          setMessages(data.messages.map((m: { messageId: string; role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
            id: m.messageId,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
          })));
        }
      } catch {
        // Non-critical — start with empty chat
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for "Explain Last 2 Min" event from NotesTab
  useEffect(() => {
    const handler = () => {
      sendMessage('Explain what was discussed in the last 2 minutes', true);
    };
    window.addEventListener('live-lecture-explain-last-2-min', handler);
    return () => window.removeEventListener('live-lecture-explain-last-2-min', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Listen for tab switch event
  useEffect(() => {
    const handler = () => {
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    window.addEventListener('live-lecture-switch-to-clara', handler);
    return () => window.removeEventListener('live-lecture-switch-to-clara', handler);
  }, []);

  // Listen for quick prompt events from NotesTab
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent).detail;
      if (typeof prompt === 'string' && prompt.trim()) {
        sendMessage(prompt);
      }
    };
    window.addEventListener('live-lecture-quick-prompt', handler);
    return () => window.removeEventListener('live-lecture-quick-prompt', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const sendMessage = useCallback(async (text: string, isExplainLast2Min = false) => {
    if (!text.trim() || !sessionId || isStreaming) return;

    const userMessage: Message = {
      id: `${Date.now()}_user`,
      role: 'user',
      content: isExplainLast2Min ? '💡 Explain the last 2 minutes' : text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Add placeholder assistant message
    const assistantId = `${Date.now()}_assistant`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      // Force sync unsynced segments to MongoDB before asking
      await syncToServer();

      const response = await fetch('/api/live-lecture/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text.trim(),
          isExplainLast2Min,
          partialTranscript: partialText || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get response');
      }

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: fullContent } : m
        ));
      }

      incrementQuestionCount();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: `⚠️ ${errorMsg}` } : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, isStreaming, incrementQuestionCount, syncToServer, partialText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="w-8 h-8 text-accent/40 mb-2" />
            <p className="text-sm text-muted-foreground/60">
              Ask Clara anything about the lecture.
            </p>
            <p className="text-xs text-muted-foreground/40 mt-1">
              Questions are answered using the live transcript.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-sm'
                : 'bg-card-bg/80 text-foreground border border-border/50 rounded-bl-sm'
            }`}>
              {!msg.content ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Thinking...
                </span>
              ) : msg.role === 'user' ? (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    code: ({ children }) => <code className="px-1 py-0.5 bg-background/50 rounded text-xs font-mono">{children}</code>,
                    h1: ({ children }) => <h3 className="font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                    h2: ({ children }) => <h3 className="font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                    h3: ({ children }) => <h3 className="font-semibold mb-1 mt-1.5 first:mt-0">{children}</h3>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-foreground/60" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-t border-border/50">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Clara about the lecture..."
          disabled={isStreaming}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
