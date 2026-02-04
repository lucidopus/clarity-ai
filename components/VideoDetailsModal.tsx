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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card-bg border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Image */}
              <div className="relative h-48 sm:h-64 w-full shrink-0">
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
                    className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-4 left-6 right-6">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {video.tags?.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-1 bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-xs font-bold rounded-md border border-cyan-500/30 backdrop-blur-md">
                                {tag}
                            </span>
                        ))}
                      </div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-md leading-tight line-clamp-2">
                          {video.title}
                      </h2>
                  </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto">
                 
                 {/* Materials Grid */}
                 <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Included Materials</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {materials.map((m) => (
                            <div 
                                key={m.label} 
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                    m.available 
                                        ? 'bg-accent/5 border-accent/20 text-accent' 
                                        : 'bg-muted/10 border-border text-muted-foreground opacity-50'
                                }`}
                            >
                                <m.icon className="w-6 h-6 mb-2" />
                                <span className="text-xs font-medium">{m.label}</span>
                                {m.available && <span className="text-[10px] mt-1 bg-accent text-white px-1.5 rounded-full">Ready</span>}
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
                 <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
                    {video.channelName && (
                        <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                 {video.channelName[0]}
                             </div>
                             <span>{video.channelName}</span>
                        </div>
                    )}
                    {video.duration && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{Math.floor(video.duration / 60)} min</span>
                        </div>
                    )}
                 </div>

                 {/* Actions */}
                 <div className="flex gap-4">
                     <Button 
                        onClick={onPlay}
                        variant="primary" 
                        size="lg" 
                        className="flex-1 font-bold shadow-lg shadow-accent/20"
                    >
                        <Play className="w-5 h-5 fill-current mr-2" />
                        Start Watching
                     </Button>
                     <Button 
                        onClick={onClose}
                        variant="secondary"
                        className="flex-1"
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
