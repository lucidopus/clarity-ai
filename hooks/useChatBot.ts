import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVisualize?: boolean;
  /** Tool activity events that occurred before this message's text content. */
  toolEvents?: ToolEvent[];
}

export interface ToolEvent {
  tool: string;
  label: string;
  status: 'active' | 'done';
}

export interface UseChatBotOptions {
  endpoint?: string; // API endpoint to use (default: '/api/chatbot/ask')
  historyEndpoint?: string; // History endpoint (default: '/api/chatbot/history')
  enableHistory?: boolean; // Whether to load/save history (default: true)
  channel?: 'chatbot' | 'guide'; // Conversation channel (default: 'chatbot')
  problemId?: string; // Problem ID (required if channel='guide')
  /**
   * Which sub-source the user is actively viewing. When set, the server uses
   * this to look up per-source content (e.g. the PDF text on a document tab)
   * while keeping flashcards / quizzes anchored to the generation's videoId.
   */
  activeSourceId?: string;
  transformRequestBody?: (payload: {
    videoId: string;
    message: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    clientTimestamp: string;
    timezoneOffsetMinutes: number;
    timeZone: string;
  }) => Record<string, unknown>; // Allows callers to inject extra fields
}

export interface UseChatBotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  remainingMessages: number;
  /** Tools currently being executed by Clara (empty when not using tools). */
  activeTools: ToolEvent[];
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

/**
 * Parse a single SSE line (data: {...}) into a typed event object.
 * Returns null for non-data lines, keep-alive comments, etc.
 */
function parseSSELine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data: ')) return null;
  try {
    return JSON.parse(trimmed.slice(6));
  } catch {
    return null;
  }
}

export function useChatBot(
  videoId: string,
  options: UseChatBotOptions = {}
): UseChatBotReturn {
  const {
    endpoint = '/api/chatbot/ask',
    historyEndpoint = '/api/chatbot/history',
    enableHistory = true,
    channel,
    problemId,
    activeSourceId,
    transformRequestBody,
  } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState(20);
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from database on mount (if history is enabled)
  useEffect(() => {
    if (!enableHistory) return;

    async function loadMessages() {
      try {
        let historyUrl = `${historyEndpoint}?videoId=${videoId}`;
        if (channel) historyUrl += `&channel=${channel}`;
        if (problemId) historyUrl += `&problemId=${problemId}`;

        const response = await fetch(historyUrl);

        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formattedMessages = data.messages.map((msg: any) => ({
              id: msg.messageId || msg._id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp)
            }));
            setMessages(formattedMessages);
          }
        }
      } catch (error) {
        console.error('Failed to load chat messages:', error);
      }
    }

    loadMessages();
  }, [videoId, enableHistory, historyEndpoint, channel, problemId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isStreaming) return;

    // Handle /visualize command
    let actualMessage = content.trim();
    let forceVisualize = false;
    if (actualMessage.toLowerCase().startsWith('/visualize ')) {
      forceVisualize = true;
      actualMessage = actualMessage.slice('/visualize '.length).trim();
      if (!actualMessage) return;
    }

    setError(null);
    setIsLoading(true);
    setActiveTools([]);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: actualMessage,
      timestamp: new Date(),
      ...(forceVisualize ? { isVisualize: true } : {}),
    };

    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolEvents: [],
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(false);
      setIsStreaming(true);

      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const clientNow = new Date();
      const timezoneOffsetMinutes = clientNow.getTimezoneOffset();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const basePayload = {
        videoId,
        message: actualMessage,
        conversationHistory,
        clientTimestamp: clientNow.toISOString(),
        timezoneOffsetMinutes,
        timeZone,
        ...(activeSourceId && activeSourceId !== videoId ? { activeSourceId } : {}),
        ...(forceVisualize ? { forceVisualize: true } : {}),
      };

      const requestBody = transformRequestBody
        ? transformRequestBody(basePayload)
        : basePayload;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      // Handle rate limit
      if (response.status === 429) {
        const errorData = await response.json().catch(() => null);
        setError(getUserFriendlyMessage(errorData, 'You\'ve reached your message limit for now. Please try again later.'));
        setRemainingMessages(0);
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        setIsStreaming(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update remaining count (-1 means unlimited)
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining && remaining !== '-1') {
        setRemainingMessages(parseInt(remaining));
      }

      // Stream response — detect format from Content-Type
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const contentType = response.headers.get('Content-Type') || '';
      const isSSE = contentType.includes('text/event-stream');
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      const collectedToolEvents: ToolEvent[] = [];

      if (isSSE) {
        // ── SSE format (agentic chatbot endpoint) ──
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines (terminated by \n\n)
          const parts = sseBuffer.split('\n\n');
          sseBuffer = parts.pop() || '';

          for (const part of parts) {
            for (const line of part.split('\n')) {
              const event = parseSSELine(line);
              if (!event) continue;

              switch (event.type) {
                case 'tool_start': {
                  const toolEvent: ToolEvent = {
                    tool: event.tool as string,
                    label: event.label as string,
                    status: 'active',
                  };
                  collectedToolEvents.push(toolEvent);
                  setActiveTools(prev => [...prev, toolEvent]);
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, toolEvents: [...collectedToolEvents] }
                      : msg
                  ));
                  break;
                }

                case 'tool_end': {
                  const toolName = event.tool as string;
                  const existing = collectedToolEvents.find(
                    t => t.tool === toolName && t.status === 'active'
                  );
                  if (existing) existing.status = 'done';
                  setActiveTools(prev =>
                    prev.map(t =>
                      t.tool === toolName && t.status === 'active'
                        ? { ...t, status: 'done' }
                        : t
                    ),
                  );
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, toolEvents: [...collectedToolEvents] }
                      : msg
                  ));
                  break;
                }

                case 'token': {
                  const tokenText = typeof event.content === 'string' ? event.content : '';
                  if (!tokenText) break;
                  accumulatedContent += tokenText;
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  ));
                  break;
                }

                case 'animation': {
                  const animationBlock = `\n\n\`\`\`animation\n${JSON.stringify(event.spec)}\n\`\`\``;
                  accumulatedContent += animationBlock;
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  ));
                  break;
                }

                case 'error': {
                  setError(getUserFriendlyMessage(
                    { message: event.message },
                    'Clara ran into an issue. Please try your message again.'
                  ));
                  break;
                }

                case 'done': {
                  setActiveTools([]);
                  break;
                }
              }
            }
          }
        }
      } else {
        // ── Plain text format (guide endpoint, legacy) ──
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedContent }
              : msg
          ));
        }
      }

      setIsStreaming(false);
      setActiveTools([]);

      // Remove empty message if streaming produced nothing
      if (!accumulatedContent.trim() && collectedToolEvents.length === 0) {
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setIsStreaming(false);
      setActiveTools([]);

      if (error.name === 'AbortError') {
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        return;
      }

      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? {
              ...msg,
              content: "I'm sorry, I'm having trouble responding right now. Please try again."
            }
          : msg
      ));
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setActiveTools([]);
    }
  }, [messages, isLoading, isStreaming, videoId, activeSourceId, endpoint, transformRequestBody]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    setError(null);

    if (enableHistory) {
      try {
        let deleteUrl = `${historyEndpoint}?videoId=${videoId}`;
        if (channel) deleteUrl += `&channel=${channel}`;
        if (problemId) deleteUrl += `&problemId=${problemId}`;

        await fetch(deleteUrl, { method: 'DELETE' });
      } catch (error) {
        console.error('Failed to clear database messages:', error);
      }
    }
  }, [videoId, enableHistory, historyEndpoint, channel, problemId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    remainingMessages,
    activeTools,
    sendMessage,
    clearMessages,
    clearError
  };
}
