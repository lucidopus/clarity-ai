import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bot } from 'lucide-react';
import { useChatBot } from '@/hooks/useChatBot';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatBotProps {
  videoId: string;
}

export function ChatBot({ videoId }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isStreaming, sendMessage, clearMessages } = useChatBot(videoId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for prerequisite click events
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      setIsOpen(true);
      sendMessage(e.detail.question);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).addEventListener('chatbot:open', handler);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).removeEventListener('chatbot:open', handler);
    };
  }, [sendMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
      <motion.button
        className="fixed cursor-pointer bottom-6 right-6 z-40 h-16 w-16 rounded-full bg-accent text-white shadow-lg hover:shadow-xl flex items-center justify-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>
      )}

      {/* Chatbot Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Dialog */}
            <motion.div
              className="relative z-10 flex h-[600px] w-full max-w-2xl flex-col rounded-2xl border border-border bg-background shadow-2xl"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-accent/10 p-2">
                    <Bot className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-semibold">AI Learning Tutor</h2>
                    <p className="text-xs text-secondary">Ask me anything about this video</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 hover:bg-card-bg"
                >
                  <X className="h-5 w-5 cursor-pointer" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hidden" ref={messagesContainerRef}>
                {messages.length === 0 && (
                  <div className="text-center text-secondary py-8">
                    <p className="mb-2">👋 Hi! I&apos;m your AI tutor.</p>
                    <p className="text-sm">Ask me about prerequisites or anything in this video!</p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && i === messages.length - 1}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border p-4">
                <ChatInput onSend={sendMessage} disabled={isStreaming} />
                <div className="mt-2 flex items-center justify-between text-xs text-secondary">
                  <button
                    onClick={clearMessages}
                    className="hover:text-foreground transition-colors cursor-pointer"
                  >
                    Clear conversation
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}