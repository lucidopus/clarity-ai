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
  document: adaptYouTubeMaterials, // Same base shape; sourceType overridden in materials API
  audio: adaptYouTubeMaterials,    // Same base shape; sourceType overridden in materials API
  media: adaptYouTubeMaterials,    // Same base shape; sourceType overridden in materials API
  text: adaptYouTubeMaterials,     // Same base shape; sourceType overridden in materials API
  live_lecture: adaptYouTubeMaterials, // Same base shape; sourceType overridden in materials API
};

export function getAdapter(sourceType: SourceType): AdapterFunction {
  const adapter = adapters[sourceType];
  if (!adapter) {
    throw new Error(`Unknown source type: ${sourceType}`);
  }
  return adapter;
}

export type { AdaptedMaterials, YouTubeAdaptedMaterials, DocumentAdaptedMaterials, AudioAdaptedMaterials, TextAdaptedMaterials, AdapterInput } from './types';
