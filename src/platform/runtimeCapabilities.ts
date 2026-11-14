export type ASTRAMEDPlatform = 'android' | 'desktop' | 'web' | 'unknown';

export interface RuntimeCapabilities {
  platform: ASTRAMEDPlatform;
  isSecureContext: boolean;
  hasIndexedDB: boolean;
  hasWebAssembly: boolean;
  hasWebGPU: boolean;
  hasCameraAPI: boolean;
  hasServiceWorker: boolean;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
}

/**
 * Detect browser-exposed capabilities only. This is a compatibility hint,
 * not a benchmark and not a guarantee that a model will fit in memory.
 */
export function detectRuntimeCapabilities(): RuntimeCapabilities {
  const browserWindow = typeof window === 'undefined' ? undefined : window;
  const browserNavigator =
    typeof navigator === 'undefined' ? undefined : navigator;

  const userAgent = browserNavigator?.userAgent ?? '';
  const isAndroid = /Android/i.test(userAgent);
  const isDesktop =
    !isAndroid &&
    typeof browserWindow !== 'undefined' &&
    /Windows|Macintosh|Linux/i.test(userAgent);

  return {
    platform: isAndroid
      ? 'android'
      : isDesktop
        ? 'desktop'
        : typeof browserWindow !== 'undefined'
          ? 'web'
          : 'unknown',
    isSecureContext:
      typeof window !== 'undefined' && window.isSecureContext,
    hasIndexedDB: typeof indexedDB !== 'undefined',
    hasWebAssembly: typeof WebAssembly !== 'undefined',
    hasWebGPU:
      typeof navigator !== 'undefined' &&
      'gpu' in navigator,
    hasCameraAPI:
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    hasServiceWorker:
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator,
    deviceMemoryGb:
      browserNavigator && 'deviceMemory' in browserNavigator
        ? Number((browserNavigator as Navigator & { deviceMemory?: number }).deviceMemory)
        : undefined,
    hardwareConcurrency: browserNavigator?.hardwareConcurrency
  };
}
