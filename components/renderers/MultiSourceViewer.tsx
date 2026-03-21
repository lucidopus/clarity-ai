'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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

const sourceActiveColors: Partial<Record<SourceType, string>> = {
  youtube: 'text-red-500 dark:text-red-400',
  document: 'text-blue-500 dark:text-blue-400',
  audio: 'text-purple-500 dark:text-purple-400',
  text: 'text-amber-500 dark:text-amber-400',
};

const sourceLabels: Partial<Record<SourceType, string>> = {
  youtube: 'YouTube',
  document: 'Document',
  audio: 'Audio',
  text: 'Text Input',
};

// Display order: YouTube → Document → Audio → Text
const sourceOrder: Record<string, number> = {
  youtube: 0,
  document: 1,
  audio: 2,
  text: 3,
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
    () => [...(materials.sources || [])].sort(
      (a, b) => (sourceOrder[a.sourceType] ?? 99) - (sourceOrder[b.sourceType] ?? 99)
    ),
    [materials.sources]
  );
  const [activeSourceId, setActiveSourceId] = useState(sources[0]?.sourceId || '');

  const activeSource = useMemo(
    () => sources.find(s => s.sourceId === activeSourceId) || sources[0],
    [sources, activeSourceId]
  );

  // Build materials for the active source
  // Only YouTube gets the floating summary button — strip summary from other source types
  const activeMaterials = useMemo(() => {
    if (!activeSource) return materials;

    return {
      ...materials,
      sourceType: activeSource.sourceType,
      summary: activeSource.sourceType === 'youtube' ? materials.summary : undefined,
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
      {/* Source Switcher Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 rounded-xl border border-border bg-card-bg p-1 flex gap-1"
      >
        {sources.map((source) => {
          const Icon = sourceIcons[source.sourceType] || FileText;
          const isActive = source.sourceId === activeSourceId;
          const activeColor = sourceActiveColors[source.sourceType] || 'text-foreground';
          const label = sourceLabels[source.sourceType] || source.sourceType;

          return (
            <button
              key={source.sourceId}
              onClick={() => setActiveSourceId(source.sourceId)}
              className={`relative flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer flex-1 min-w-0 justify-center ${
                isActive
                  ? `${activeColor} bg-background shadow-sm`
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {label}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Active Source Viewer */}
      <div key={activeSourceId}>
        <SourceContentViewer
          sourceType={activeSourceType}
          materials={activeMaterials}
          notes={notes}
          onSaveNotes={onSaveNotes}
          autoplayVideos={autoplayVideos}
        />
      </div>
    </div>
  );
}
