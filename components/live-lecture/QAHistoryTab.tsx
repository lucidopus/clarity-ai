'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, MessageSquare, Loader2 } from 'lucide-react';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';

interface QAMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface QAHistoryTabProps {
  videoId: string;
  sessionId: string;
}

export default function QAHistoryTab({ videoId, sessionId }: QAHistoryTabProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // sessionId here is actually the sourceId from the URL.
        // Chat messages were saved with contextId = live lecture sessionId (not sourceId).
        // First, resolve the actual live lecture sessionId from the sourceId.
        let actualSessionId = sessionId;
        try {
          const sessionRes = await fetch(`/api/live-lecture/by-source/${sessionId}`);
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData.sessionId) {
              actualSessionId = sessionData.sessionId;
            }
          }
        } catch {
          // Fall back to using sourceId as contextId
        }

        const res = await fetch(
          `/api/chatbot/history?videoId=${videoId}&channel=live_lecture&contextId=${actualSessionId}`
        );
        if (!res.ok) throw new Error('Failed to load Q&A history');
        const json = await res.json();

        // Map chat messages to simplified format
        const mapped: QAMessage[] = (json.messages || []).map(
          (m: { role: string; content: string; timestamp: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp,
          })
        );
        setMessages(mapped);
      } catch (err) {
        setError(getUserFriendlyMessage(err, 'We couldn\'t load your Q&A history. Please try again shortly.'));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [videoId, sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-20">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No questions asked</h3>
        <p className="text-muted-foreground text-sm">
          No questions were asked during this lecture session.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto w-full space-y-4"
    >
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">
          Q&A During Lecture ({Math.floor(messages.length / 2)} questions)
        </h3>
      </div>

      <div className="space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex gap-3 ${msg.role === 'user' ? '' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-teal-500/10 text-teal-400'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">
                  {msg.role === 'user' ? 'You' : 'Clara'}
                </span>
                {msg.timestamp && (
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <div
                className={`text-sm leading-relaxed rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-accent/10 text-foreground'
                    : 'bg-card-bg border border-border text-foreground/90'
                }`}
              >
                {msg.content.split('\n').map((line, j) => (
                  <p key={j} className={j > 0 ? 'mt-2' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
