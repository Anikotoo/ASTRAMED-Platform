/**
 * ASTRAMED local computer-vision runtime contract.
 *
 * A pose model produces keypoints only. A separate, validated movement
 * assessment engine must calculate angles, repetitions and quality metrics.
 */

export type VisionRuntimePlatform = 'web' | 'android' | 'desktop';

export type VisionRuntimeState =
  | 'unavailable'
  | 'model-missing'
  | 'ready'
  | 'loading'
  | 'error';

export interface PoseKeypoint {
  name: string;
  x: number;
  y: number;
  confidence: number;
}

export interface PosePerson {
  keypoints: PoseKeypoint[];
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VisionFrame {
  /** Platform-owned image/frame object; never persisted by this interface. */
  source: unknown;
  width: number;
  height: number;
  capturedAt: number;
}

export interface PoseDetectionOptions {
  confidenceThreshold?: number;
  maximumPeople?: number;
}

export interface VisionRuntimeStatus {
  provider: string;
  state: VisionRuntimeState;
  modelId?: string;
  message?: string;
}

export interface PoseDetectionResult {
  people: PosePerson[];
  inferenceMs: number;
  frameWidth: number;
  frameHeight: number;
  capturedAt: number;
}

export interface PoseDetectionRuntime {
  readonly providerId: string;
  getStatus(): Promise<VisionRuntimeStatus>;
  loadModel(modelId: string, onProgress?: (progress: number) => void): Promise<void>;
  detectPose(
    frame: VisionFrame,
    options?: PoseDetectionOptions
  ): Promise<PoseDetectionResult>;
  dispose(): Promise<void>;
}

/**
 * Do not label a missing/occluded keypoint as a zero-degree movement.
 * Consumers must reject low-confidence or incomplete frames.
 */
