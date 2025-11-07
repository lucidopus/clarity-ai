import { useState, useEffect, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UseChatBotOptions {
  endpoint?: string; // API endpoint to use (default: '/api/chatbot/ask')
  historyEndpoint?: string; // History endpoint (default: '/api/chatbot/history')
  enableHistory?: boolean; // Whether to load/save history (default: true)
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
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export function useChatBot(
  videoId: string,
  options: UseChatBotOptions = {}
): UseChatBotReturn {
  const {
    endpoint = '/api/chatbot/ask',
    historyEndpoint = '/api/chatbot/history',
    enableHistory = true,
    transformRequestBody,
  } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState(20);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from database on mount (if history is enabled)
  useEffect(() => {
    if (!enableHistory) return;

    async function loadMessages() {
      try {
        const response = await fetch(`${historyEndpoint}?videoId=${videoId}`);

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
        // No fallback, messages remain empty
      }
    }

    loadMessages();
  }, [videoId, enableHistory, historyEndpoint]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isStreaming) return;

    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(false);
      setIsStreaming(true);

      // Prepare conversation history (last 3 exchanges = 6 messages)
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const clientNow = new Date();
      const timezoneOffsetMinutes = clientNow.getTimezoneOffset();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const basePayload = {
        videoId,
        message: content.trim(),
        conversationHistory,
        clientTimestamp: clientNow.toISOString(),
        timezoneOffsetMinutes,
        timeZone,
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
        const errorData = await response.json();
        setError(errorData.message);
        setRemainingMessages(0);
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        setIsStreaming(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update remaining count
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining) {
        setRemainingMessages(parseInt(remaining));
      }

      // Stream response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        // Update message incrementally
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: accumulatedContent }
            : msg
        ));
      }

      setIsStreaming(false);

      // Remove empty message if streaming produced nothing
      if (!accumulatedContent.trim()) {
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setIsStreaming(false);

      // Handle abort (user cancelled)
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
    }
  }, [messages, isLoading, isStreaming, videoId, endpoint, transformRequestBody]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    setError(null);

    // Clear from database (if history is enabled)
    if (enableHistory) {
      try {
        await fetch(`${historyEndpoint}?videoId=${videoId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to clear database messages:', error);
      }
    }
  }, [videoId, enableHistory, historyEndpoint]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    remainingMessages,
    sendMessage,
    clearMessages,
    clearError
  };
}
