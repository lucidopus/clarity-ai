import { useState, useEffect, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

const STORAGE_KEY_PREFIX = 'chatbot-messages-';

export function useChatBot(videoId: string): UseChatBotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState(20);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + videoId);
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  }, [videoId]);

  // Save to LocalStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + videoId, JSON.stringify(messages));
      } catch (error) {
        console.error('Failed to save chat messages:', error);
      }
    }
  }, [messages, videoId]);

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

      const response = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          message: content.trim(),
          conversationHistory
        }),
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
  }, [messages, isLoading, isStreaming, videoId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + videoId);
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }, [videoId]);

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