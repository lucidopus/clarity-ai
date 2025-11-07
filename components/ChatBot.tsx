import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bot, Trash2 } from 'lucide-react';
import { useChatBot } from '@/hooks/useChatBot';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { CHATBOT_NAME } from '@/lib/config';
import Dialog from './Dialog';

interface ChatBotProps {
  videoId: string;
}

export function ChatBot({ videoId }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { messages, isStreaming, sendMessage, clearMessages } = useChatBot(videoId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const hasInitializedScrollRef = useRef(false);
  const anchoredUserMessageRef = useRef<string | null>(null);
  const reservedSpaceRef = useRef(0);
  const spacerElementRef = useRef<HTMLDivElement | null>(null);
  const computeTopBuffer = useCallback((anchor: HTMLElement, container: HTMLElement) => {
    const anchorHeight = anchor.offsetHeight;
    const maxBuffer = container.clientHeight * 0.5;
    return Math.max(96, Math.min(maxBuffer, anchorHeight + 64));
  }, []);

  const updateSpacer = useCallback((
    value: number,
    anchorElement?: HTMLElement | null,
    preserveAnchorOffset = true
  ) => {
    const container = messagesContainerRef.current;
    const spacer = spacerElementRef.current;

    let anchorOffsetBefore: number | null = null;
    if (preserveAnchorOffset && container && anchorElement) {
      const containerRect = container.getBoundingClientRect();
      const anchorRect = anchorElement.getBoundingClientRect();
      anchorOffsetBefore = anchorRect.top - containerRect.top;
    }

    reservedSpaceRef.current = value;

    if (spacer) {
      if (value > 0) {
        spacer.style.display = 'block';
        spacer.style.height = `${value}px`;
      } else {
        spacer.style.display = 'none';
        spacer.style.height = '0px';
      }
    }

    if (preserveAnchorOffset && container && anchorElement && anchorOffsetBefore !== null) {
      requestAnimationFrame(() => {
        const containerRectAfter = container.getBoundingClientRect();
        const anchorRectAfter = anchorElement.getBoundingClientRect();
        const anchorOffsetAfter = anchorRectAfter.top - containerRectAfter.top;
        const diff = anchorOffsetAfter - anchorOffsetBefore;
        if (Math.abs(diff) > 0.5) {
          container.scrollTop += diff;
        }
      });
    }
  }, []);

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

  // Anchor new user messages near the top, leaving room for the assistant to stream
  useEffect(() => {
    if (messages.length === 0) {
      if (reservedSpaceRef.current !== 0) {
        updateSpacer(0);
      }
      anchoredUserMessageRef.current = null;
      previousMessageCountRef.current = 0;
      return;
    }

    const container = messagesContainerRef.current;
    const previousCount = previousMessageCountRef.current;
    const hasNewMessages = messages.length > previousCount;

    let shouldScrollToAnchor = false;

    if (hasNewMessages) {
      const newlyAddedMessages = messages.slice(previousCount);
      const latestUserMessage = [...newlyAddedMessages]
        .reverse()
        .find(msg => msg.role === 'user');

      if (latestUserMessage) {
        anchoredUserMessageRef.current = latestUserMessage.id;
        shouldScrollToAnchor = true;
      }
    } else if (!anchoredUserMessageRef.current) {
      const latestUserMessage = [...messages]
        .reverse()
        .find(msg => msg.role === 'user');

      if (latestUserMessage) {
        anchoredUserMessageRef.current = latestUserMessage.id;
      }
    }

    if (!container) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    const anchorId = anchoredUserMessageRef.current;
    if (!anchorId) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    const anchorElement = container.querySelector<HTMLElement>(`[data-message-id="${anchorId}"]`);
    if (!anchorElement) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    const latestAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === 'assistant');

    const assistantElement = latestAssistantMessage
      ? container.querySelector<HTMLElement>(`[data-message-id="${latestAssistantMessage.id}"]`)
      : null;

    const streamingHeight = assistantElement ? assistantElement.offsetHeight : 0;
    const topBuffer = computeTopBuffer(anchorElement, container);
    const reservePadding = 24;
    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchorElement.getBoundingClientRect();
    const anchorScrollTop = container.scrollTop + (anchorRect.top - containerRect.top);
    const viewportReserve = Math.max(container.clientHeight - anchorElement.offsetHeight - topBuffer, 0);
    const desiredReserve = Math.max(viewportReserve - streamingHeight - reservePadding, 0);

    const needsInitialAnchorScroll = !hasInitializedScrollRef.current && !shouldScrollToAnchor;
    const shouldScrollNow = shouldScrollToAnchor || needsInitialAnchorScroll;

    if (reservedSpaceRef.current !== desiredReserve) {
      updateSpacer(desiredReserve, anchorElement, !shouldScrollNow);
    }

    if (shouldScrollNow) {
      const desiredScrollTop = Math.max(anchorScrollTop - topBuffer, 0);

      if (!hasInitializedScrollRef.current) {
        hasInitializedScrollRef.current = true;
        container.scrollTop = desiredScrollTop;
      } else {
        requestAnimationFrame(() => {
          container.scrollTo({
            top: desiredScrollTop,
            behavior: 'smooth'
          });
        });
      }
    }

    previousMessageCountRef.current = messages.length;
  }, [messages, isStreaming, updateSpacer, computeTopBuffer]);

  // Auto-scroll to bottom when chatbot opens
  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const scrollTop = container.scrollHeight - container.clientHeight;
      if (scrollTop > 0) {
        container.scrollTop = scrollTop;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || hasInitializedScrollRef.current) {
      return;
    }

    if (messages.length > 0) {
      const initialScrollTop = container.scrollHeight - container.clientHeight;
      if (initialScrollTop > 0) {
        container.scrollTop = initialScrollTop;
      }
      hasInitializedScrollRef.current = true;
      previousMessageCountRef.current = messages.length;
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const handleResize = () => {
      if (reservedSpaceRef.current <= 0) return;

      const anchorId = anchoredUserMessageRef.current;
      if (!anchorId) return;

      const anchorElement = container.querySelector<HTMLElement>(`[data-message-id="${anchorId}"]`);
      if (!anchorElement) return;

      const latestAssistantMessage = [...messages]
        .reverse()
        .find(msg => msg.role === 'assistant');
      const assistantElement = latestAssistantMessage
        ? container.querySelector<HTMLElement>(`[data-message-id="${latestAssistantMessage.id}"]`)
        : null;

      const streamingHeight = assistantElement ? assistantElement.offsetHeight : 0;
      const topBuffer = computeTopBuffer(anchorElement, container);
      const reservePadding = 24;
      const viewportReserve = Math.max(container.clientHeight - anchorElement.offsetHeight - topBuffer, 0);
      const desiredReserve = Math.max(viewportReserve - streamingHeight - reservePadding, 0);

      if (reservedSpaceRef.current !== desiredReserve) {
        updateSpacer(desiredReserve, anchorElement);
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [messages, isStreaming, updateSpacer, computeTopBuffer]);
  return (
    <>
      {/* Smart Keyboard Shortcut Indicator */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, delay: 1 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none"
          >
            <div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-mono font-semibold text-primary">⌘K</span>
                <span className="text-foreground">to chat</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
               className="relative z-10 flex h-[800px] w-full max-w-4xl flex-col rounded-2xl border border-border bg-background shadow-2xl"
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
                     <h2 className="font-semibold">{CHATBOT_NAME}</h2>
                     <p className="text-xs text-secondary">Ask {CHATBOT_NAME} anything about this video</p>
                   </div>
                </div>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={() => setShowClearConfirm(true)}
                     className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card-bg hover:bg-card-bg/80 transition-colors cursor-pointer text-secondary hover:text-foreground text-xs"
                     title="Clear conversation"
                   >
                     <Trash2 className="h-3 w-3" />
                     Clear Chat
                   </button>
                   <button
                     onClick={() => setIsOpen(false)}
                     className="rounded-lg p-2 hover:bg-card-bg"
                   >
                     <X className="h-5 w-5 cursor-pointer" />
                   </button>
                 </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hidden" ref={messagesContainerRef}>
                 {messages.length === 0 && (
                   <div className="text-center text-secondary py-8">
                     <p className="mb-2">👋 Hi! I&apos;m {CHATBOT_NAME}.</p>
                     <p className="text-sm">Ask {CHATBOT_NAME} about prerequisites or anything in this video!</p>
                   </div>
                 )}

                {messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && i === messages.length - 1}
                  />
                ))}
                <div
                  aria-hidden="true"
                  ref={spacerElementRef}
                  className="pointer-events-none shrink-0"
                  style={{ display: 'none', height: 0 }}
                />
              </div>

               {/* Input */}
               <div className="border-t border-border p-4">
                 <ChatInput onSend={sendMessage} disabled={isStreaming} />
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Conversation Confirmation Dialog */}
      <Dialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearMessages();
          setShowClearConfirm(false);
        }}
        type="confirm"
        variant="warning"
        title="Clear Conversation"
        message="Are you sure you want to clear this conversation? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
      />
    </>
  );
}
