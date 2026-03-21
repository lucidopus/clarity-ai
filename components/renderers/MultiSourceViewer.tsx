'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, FileText, Headphones, StickyNote } from 'lucide-react';
import type { ContentViewerProps } from './types';
import type { SourceType } from '@/lib/models/Source';
import YouTubeContentViewer from './YouTubeContentViewer';
import DocumentContentViewer from './DocumentContentViewer';
import TextContentViewer from './TextContentViewer';
import AudioContentViewer from './AudioContentViewer';

interface SourceInfo {
  sourceId: string;
  sourceType: SourceType;
  title: string;
  fileName?: string;
  fileUrl?: string;
  sourceUrl?: string;
  duration?: number;
  mimeType?: string;
}

const sourceIcons: Partial<Record<SourceType, typeof Youtube>> = {
  youtube: Youtube,
  document: FileText,
  audio: Headphones,
  text: StickyNote,
};

const sourceColors: Partial<Record<SourceType, string>> = {
  youtube: 'text-red-400 bg-red-500/10 border-red-500/20',
  document: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  audio: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  text: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const sourceLabels: Partial<Record<SourceType, string>> = {
  youtube: 'YouTube',
  document: 'Document',
  audio: 'Audio',
  text: 'Text Notes',
};

function SourceContentViewer({
  sourceType,
  ...props
}: ContentViewerProps & { sourceType: SourceType }) {
  switch (sourceType) {
    case 'youtube':
      return <YouTubeContentViewer {...props} />;
    case 'document':
      return <DocumentContentViewer {...props} />;
    case 'audio':
      return <AudioContentViewer {...props} />;
    case 'text':
      return <TextContentViewer {...props} />;
    default:
      return <TextContentViewer {...props} />;
  }
}

/**
 * Multi-Source Viewer
 *
 * Renders source switcher pills when a generation has multiple sources.
 * Selecting a pill loads the appropriate content viewer for that source.
 */
export default function MultiSourceViewer({
  materials,
  notes,
  onSaveNotes,
  autoplayVideos,
}: ContentViewerProps) {
  const sources: SourceInfo[] = useMemo(
    () => materials.sources || [],
    [materials.sources]
  );
  const [activeSourceId, setActiveSourceId] = useState(sources[0]?.sourceId || '');

  const activeSource = useMemo(
    () => sources.find(s => s.sourceId === activeSourceId) || sources[0],
    [sources, activeSourceId]
  );

  // Build materials for the active source
  const activeMaterials = useMemo(() => {
    if (!activeSource) return materials;

    return {
      ...materials,
      sourceType: activeSource.sourceType,
      video: {
        ...materials.video,
        sourceId: activeSource.sourceId,
        title: activeSource.title || materials.video.title,
      },
      sourceMeta: {
        fileUrl: activeSource.fileUrl,
        fileName: activeSource.fileName,
        sourceUrl: activeSource.sourceUrl,
        mimeType: activeSource.mimeType,
      },
    };
  }, [materials, activeSource]);

  const activeSourceType = activeSource?.sourceType || 'youtube';

  return (
    <div className="flex flex-col gap-5">
      {/* Source Switcher Pills */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 flex-wrap"
      >
        {sources.map((source) => {
          const Icon = sourceIcons[source.sourceType] || FileText;
          const isActive = source.sourceId === activeSourceId;
          const colorClasses = sourceColors[source.sourceType] || 'text-muted-foreground bg-card-bg border-border';
          const label = sourceLabels[source.sourceType] || source.sourceType;
          const displayTitle = source.fileName || source.title || label;

          return (
            <button
              key={source.sourceId}
              onClick={() => setActiveSourceId(source.sourceId)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? `${colorClasses} ring-1 ring-current/20`
                  : 'text-muted-foreground bg-card-bg border-border hover:border-border/80 hover:bg-muted/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px]">
                {label}: {displayTitle}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Active Source Viewer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSourceId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <SourceContentViewer
            sourceType={activeSourceType}
            materials={activeMaterials}
            notes={notes}
            onSaveNotes={onSaveNotes}
            autoplayVideos={autoplayVideos}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
