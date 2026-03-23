/**
 * Detect WebGL/Canvas support for animation rendering.
 * Used to determine if we can render interactive animations or need a fallback.
 */

let cachedResult: boolean | null = null;

export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (cachedResult !== null) return cachedResult;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    cachedResult = gl !== null;
  } catch {
    cachedResult = false;
  }

  return cachedResult;
}

export function isCanvasSupported(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('2d') !== null;
  } catch {
    return false;
  }
}
