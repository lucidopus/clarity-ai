'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Youtube,
  File,
  FileText,
  Headphones,
  Mic,
  Zap,
  Brain,
  BookOpen,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import Button from '@/components/Button';

interface EmptyDashboardProps {
  firstName?: string;
  onGenerateClick: () => void;
  onLiveLectureClick: () => void;
}

const SOURCE_TYPES = [
  {
    id: 'youtube',
    label: 'YouTube',
    description: 'Paste a link to any educational video.',
    icon: Youtube,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
    iconBorder: 'border-red-500/20',
  },
  {
    id: 'document',
    label: 'Document',
    description: 'Upload a PDF or slide deck.',
    icon: File,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/20',
  },
  {
    id: 'text',
    label: 'Text notes',
    description: 'Paste your notes or an article.',
    icon: FileText,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
    iconBorder: 'border-blue-500/20',
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Upload a recording or podcast.',
    icon: Headphones,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
    iconBorder: 'border-purple-500/20',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Flashcards with spaced repetition',
    description: 'Active recall that adapts to how well you remember.',
  },
  {
    icon: Brain,
    title: 'Quizzes that actually test understanding',
    description: 'Questions designed to reveal what you know — not trivia.',
  },
  {
    icon: BookOpen,
    title: 'Mind maps, notes, and chapters',
    description: 'See how ideas connect and skim what matters most.',
  },
  {
    icon: MessageSquare,
    title: 'Clara, your AI tutor',
    description: 'Ask anything about your material and get grounded answers.',
  },
];

export default function EmptyDashboard({
  firstName,
  onGenerateClick,
  onLiveLectureClick,
}: EmptyDashboardProps) {
  return (
    <div className="space-y-8 md:space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden bg-linear-to-br from-accent/5 via-card-bg to-card-bg border border-border rounded-2xl p-6 md:p-10"
      >
        <div
          className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-24 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Let&apos;s set you up</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 leading-tight">
            Turn anything you&apos;re learning{' '}
            <span className="text-accent">into flashcards, quizzes, and notes.</span>
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mb-6 leading-relaxed">
            Drop a YouTube link, upload a PDF, paste your notes, or record a lecture. In a minute or
            two, you&apos;ll have a full study kit and an AI tutor who knows your material.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="md" onClick={onGenerateClick}>
              <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
              Generate your first material
            </Button>
            <Button variant="outline" size="md" onClick={onLiveLectureClick}>
              <Mic className="w-4 h-4 mr-2" aria-hidden="true" />
              Record a live lecture
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Source cards */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Start with a source
          </h3>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Any one works — you can combine later.
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {SOURCE_TYPES.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={s.id}
                type="button"
                onClick={onGenerateClick}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i, ease: 'easeOut' }}
                aria-label={`Start with ${s.label}`}
                className="group text-left bg-card-bg border border-border rounded-2xl p-4 md:p-5 transition-all hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${s.iconBg} border ${s.iconBorder} flex items-center justify-center mb-3 md:mb-4`}
                >
                  <Icon className={`w-5 h-5 ${s.iconColor}`} aria-hidden="true" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-foreground group-hover:text-accent transition-colors">
                    {s.label}
                  </span>
                  <ArrowRight
                    className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {s.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Feature strip */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-foreground mb-3">
          What you&apos;ll build
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + 0.05 * i, ease: 'easeOut' }}
                className="flex gap-4 bg-card-bg border border-border rounded-2xl p-4 md:p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground mb-1 leading-tight">{f.title}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {firstName && (
        <p className="text-center text-sm text-muted-foreground pt-2">
          You&apos;re all set, {firstName}. Pick a source above to begin.
        </p>
      )}
    </div>
  );
}
