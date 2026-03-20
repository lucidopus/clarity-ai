/**
 * Output Adapter Factory
 *
 * Returns the correct adapter for a given source type.
 * Pattern mirrors lib/extractors/index.ts.
 */

import type { SourceType } from '@/lib/models/Source';
import type { AdapterFunction } from './types';
import { adaptYouTubeMaterials } from './youtube';

const adapters: Record<SourceType, AdapterFunction> = {
  youtube: adaptYouTubeMaterials,
  document: () => { throw new Error('Document adapter not yet implemented'); },
  audio: () => { throw new Error('Audio adapter not yet implemented'); },
  media: () => { throw new Error('Media adapter not yet implemented'); },
  text: adaptYouTubeMaterials, // Text uses the same adapter shape as YouTube (no special rendering needed)
};

export function getAdapter(sourceType: SourceType): AdapterFunction {
  const adapter = adapters[sourceType];
  if (!adapter) {
    throw new Error(`Unknown source type: ${sourceType}`);
  }
  return adapter;
}

export type { AdaptedMaterials, YouTubeAdaptedMaterials, AdapterInput } from './types';
