/**
 * ASTRAMED local language-model runtime contract.
 *
 * UI and mission logic depend on this interface, never directly on Ollama.
 * Desktop and Android can therefore use different inference backends while
 * exposing the same application-level API.
 */

export type AIRuntimePlatform = 'web' | 'android' | 'desktop';

export type AIRuntimeState =
  | 'unavailable'
  | 'not-installed'
  | 'model-missing'
  | 'ready'
  | 'loading'
  | 'error';

export interface AIModelDescriptor {
  id: string;
  displayName: string;
  family: string;
  quantization?: string;
  sizeBytes?: number;
  minimumRamBytes?: number;
  supportedPlatforms: AIRuntimePlatform[];
  isDownloaded: boolean;
}

export interface AIRuntimeStatus {
  provider: string;
  state: AIRuntimeState;
  activeModelId?: string;
  message?: string;
}

export interface AIChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  conversation: AIChatTurn[];
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface AIChatResponse {
  text: string;
  modelId: string;
  provider: string;
  durationMs?: number;
  finishReason?: 'stop' | 'length' | 'cancelled' | 'unknown';
}

export interface AIModelRuntime {
  readonly providerId: string;
  getStatus(): Promise<AIRuntimeStatus>;
  listModels(): Promise<AIModelDescriptor[]>;
  loadModel(modelId: string, onProgress?: (progress: number) => void): Promise<void>;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
  unloadModel?(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * ASTRAMED must keep deterministic health calculations and safety checks
 * outside the language model. The model explains evidence; it does not
 * create or alter measured telemetry.
 */
