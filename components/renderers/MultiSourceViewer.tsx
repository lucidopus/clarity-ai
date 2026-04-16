'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Youtube, FileText, Headphones, StickyNote, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface MultiSourceViewerProps extends ContentViewerProps {
  /** Optional controlled active source. When provided, the viewer defers
   *  to the parent so downstream consumers (e.g. Clara chatbot) can query
   *  whichever source the user is actively looking at. */
  activeSourceId?: string;
  onActiveSourceChange?: (sourceId: string) => void;
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
  activeSourceId: controlledActiveSourceId,
  onActiveSourceChange,
}: MultiSourceViewerProps) {
  const sources: SourceInfo[] = useMemo(
    () => [...(materials.sources || [])].sort(
      (a, b) => (sourceOrder[a.sourceType] ?? 99) - (sourceOrder[b.sourceType] ?? 99)
    ),
    [materials.sources]
  );

  // Group sources by type so duplicate "Document" tabs collapse into one chip with a count
  const sourceGroups = useMemo(() => {
    const map = new Map<SourceType, SourceInfo[]>();
    sources.forEach((s) => {
      const arr = map.get(s.sourceType) || [];
      arr.push(s);
      map.set(s.sourceType, arr);
    });
    return Array.from(map.entries()).map(([type, items]) => ({ type, items }));
  }, [sources]);

  const [internalActiveSourceId, setInternalActiveSourceId] = useState(
    sources[0]?.sourceId || ''
  );
  // Prefer the controlled prop when provided; fall back to internal state so
  // this component still works on its own for any legacy callers.
  const activeSourceId = controlledActiveSourceId ?? internalActiveSourceId;
  const setActiveSourceId = (next: string) => {
    if (onActiveSourceChange) onActiveSourceChange(next);
    else setInternalActiveSourceId(next);
  };

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
      {/* Source Switcher — segmented pill with inline stepper that only appears on the active group */}
      <div className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-0.5 rounded-full border border-border bg-background p-1 shadow-sm"
        >
          {sourceGroups.map((group) => {
            const Icon = sourceIcons[group.type] || FileText;
            const activeColor = sourceActiveColors[group.type] || 'text-foreground';
            const label = sourceLabels[group.type] || group.type;
            const count = group.items.length;
            const isActive = group.items.some((s) => s.sourceId === activeSourceId);
            const isMulti = count > 1;
            const activeIndex = group.items.findIndex((s) => s.sourceId === activeSourceId);
            const currentItem = isActive && activeIndex >= 0 ? group.items[activeIndex] : group.items[0];
            const currentLabel =
              currentItem?.fileName || currentItem?.title || `${label} ${(activeIndex >= 0 ? activeIndex : 0) + 1}`;

            const cycle = (dir: 1 | -1) => {
              if (!isActive) return;
              const cur = activeIndex >= 0 ? activeIndex : 0;
              const next = (cur + dir + count) % count;
              setActiveSourceId(group.items[next].sourceId);
            };

            return (
              <button
                key={group.type}
                type="button"
                onClick={() => {
                  if (!isActive) setActiveSourceId(group.items[0].sourceId);
                }}
                title={isActive ? currentLabel : `Switch to ${label}`}
                className={`relative inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                  isActive ? activeColor : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="source-tab-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        'color-mix(in srgb, var(--foreground) 5%, var(--background))',
                      boxShadow:
                        '0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px color-mix(in srgb, var(--foreground) 8%, transparent)',
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                  {isMulti && !isActive && (
                    <span
                      className="font-mono text-[10px] font-semibold px-1.5 py-px rounded-full"
                      style={{
                        background: 'color-mix(in srgb, currentColor 14%, transparent)',
                      }}
                    >
                      {count}
                    </span>
                  )}
                  {isMulti && isActive && (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full font-mono text-[10px] font-semibold tabular-nums"
                      style={{
                        background: 'color-mix(in srgb, currentColor 14%, transparent)',
                      }}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Previous ${label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          cycle(-1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            cycle(-1);
                          }
                        }}
                        className="inline-flex items-center justify-center w-3.5 h-3.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <ChevronLeft size={11} strokeWidth={2.5} />
                      </span>
                      <span className="px-0.5 select-none">
                        {(activeIndex >= 0 ? activeIndex + 1 : 1)}/{count}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Next ${label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          cycle(1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            cycle(1);
                          }
                        }}
                        className="inline-flex items-center justify-center w-3.5 h-3.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <ChevronRight size={11} strokeWidth={2.5} />
                      </span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </motion.div>
      </div>

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
