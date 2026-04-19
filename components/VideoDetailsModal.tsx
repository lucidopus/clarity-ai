'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, BookOpen, Brain, Network, Target } from 'lucide-react';
import Button from './Button';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface VideoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    _id: string; // Mongo ID
    videoId?: string; // YouTube ID
    title: string;
    description?: string; // Summary
    summary?: string;
    thumbnail?: string;
    channelName?: string;
    duration?: number; // seconds
    tags?: string[];
    materialsStatus?: 'complete' | 'incomplete' | 'generating';
    incompleteMaterials?: string[];
  };
  onPlay: () => void;
}

export default function VideoDetailsModal({ isOpen, onClose, video, onPlay }: VideoDetailsModalProps) {
  if (!isOpen) return null;

  // Determine material availability
  // If incomplete, check missing array.
  
  const checkMaterial = (key: string) => {
      // If status is complete, assume yes (unless explicitly excluded, which logic usually implies complete = all gen)
      // Actually Logic B says: incompleteMaterials lists what failed or is missing.
      return !video.incompleteMaterials?.includes(key); 
  };

  const materials = [
    { label: 'Flashcards', icon: BookOpen, available: checkMaterial('flashcards') },
    { label: 'Quizzes', icon: Brain, available: checkMaterial('quizzes') },
    { label: 'Mind Map', icon: Network, available: checkMaterial('mindmap') },
    { label: 'Challenges', icon: Target, available: checkMaterial('casestudies') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4"
          >
            {/* Modal — bottom sheet on mobile, centered on sm+ */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card-bg border-t sm:border border-border w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl landscape-phone-fill shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] pb-[env(safe-area-inset-bottom)] sm:pb-0"
            >
              {/* Header Image */}
              <div className="relative h-40 sm:h-64 w-full shrink-0">
                  {video.thumbnail ? (
                      <Image 
                        src={video.thumbnail} 
                        alt={video.title} 
                        fill 
                        className="object-cover" 
                      />
                  ) : (
                      <div className="w-full h-full bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card-bg via-transparent to-transparent" />
                  
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 inline-flex items-center justify-center w-11 h-11 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        {video.tags?.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 sm:py-1 bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-[10px] sm:text-xs font-bold rounded-md border border-cyan-500/30 backdrop-blur-md">
                                {tag}
                            </span>
                        ))}
                      </div>
                      <h2 className="text-lg sm:text-2xl font-bold text-white drop-shadow-md leading-tight line-clamp-2">
                          {video.title}
                      </h2>
                  </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6 overflow-y-auto">

                 {/* Materials Grid — compact inline pills on mobile, larger
                     stacked cards on sm+. */}
                 <div className="mb-5 sm:mb-6">
                    <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3">Included Materials</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {materials.map((m) => (
                            <div
                                key={m.label}
                                className={`flex flex-row sm:flex-col items-center sm:justify-center gap-2 sm:gap-0 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border transition-all ${
                                    m.available
                                        ? 'bg-accent/5 border-accent/20 text-accent'
                                        : 'bg-muted/10 border-border text-muted-foreground opacity-50'
                                }`}
                            >
                                <m.icon className="w-4 h-4 sm:w-6 sm:h-6 sm:mb-2 shrink-0" />
                                <span className="text-xs font-medium truncate sm:text-center">{m.label}</span>
                                {m.available && <span className="hidden sm:inline-block text-[10px] mt-1 bg-accent text-white px-1.5 rounded-full">Ready</span>}
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Summary Section */}
                 <div className="mb-6">
                     <div className="text-sm leading-relaxed">
                         <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-foreground">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-foreground">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3 first:mt-0 text-foreground">{children}</h3>,
                            p: ({ children }) => <p className="mb-3 last:mb-0 text-foreground/90">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1 marker:text-accent/70">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1 marker:text-accent/70">{children}</ol>,
                            li: ({ children }) => <li className="pl-1 leading-relaxed text-foreground/90">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-accent">{children}</strong>,
                            em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                            code: ({ children }) => <code className="bg-accent/10 px-1 py-0.5 rounded text-accent font-mono text-xs">{children}</code>,
                          }}
                         >
                             {video.summary || video.description || "No summary available for this video."}
                         </ReactMarkdown>
                     </div>
                 </div>
                 
                 {/* Meta Info */}
                 <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-border">
                    {video.channelName && (
                        <div className="flex items-center gap-2 min-w-0">
                             <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                 {video.channelName[0]}
                             </div>
                             <span className="truncate">{video.channelName}</span>
                        </div>
                    )}
                    {video.duration && (
                        <div className="flex items-center gap-1 shrink-0">
                            <Clock className="w-4 h-4" />
                            <span>{Math.floor(video.duration / 60)} min</span>
                        </div>
                    )}
                 </div>

                 {/* Actions — compact on mobile, original size on sm+ */}
                 <div className="flex gap-2 sm:gap-4">
                     <Button
                        onClick={onPlay}
                        variant="primary"
                        size="sm"
                        className="flex-1 font-bold shadow-lg shadow-accent/20 sm:text-lg sm:px-8 sm:py-4"
                    >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current mr-1.5 sm:mr-2" />
                        Start Watching
                     </Button>
                     <Button
                        onClick={onClose}
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:text-base sm:px-6 sm:py-3"
                    >
                        Close
                     </Button>
                 </div>

              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
