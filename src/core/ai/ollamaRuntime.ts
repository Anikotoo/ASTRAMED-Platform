/**
 * Same-origin client adapter for ASTRAMED's local Ollama bridge.
 * The browser never contacts a remote model service; the server bridge
 * only connects to a loopback Ollama instance on this device.
 */
import type {
  AIChatRequest,
  AIChatResponse,
  AIModelDescriptor,
  AIModelRuntime,
  AIRuntimeStatus
} from './runtime';

interface LocalAIStatusResponse {
  provider: string;
  state: AIRuntimeStatus['state'];
  models?: string[];
  message?: string;
}

export class OllamaRuntime implements AIModelRuntime {
  readonly providerId = 'ollama-local';
  private activeModelId?: string;
  private disposed = false;

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (this.disposed) throw new Error('Local AI runtime has been disposed.');
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Local AI request failed (${response.status}).`);
    }
    return payload as T;
  }

  async getStatus(): Promise<AIRuntimeStatus> {
    try {
      const status = await this.request<LocalAIStatusResponse>('/api/local-ai/status');
      return {
        provider: status.provider,
        state: status.state,
        activeModelId: this.activeModelId,
        message: status.message
      };
    } catch (error) {
      return {
        provider: 'ollama',
        state: 'unavailable',
        message: error instanceof Error ? error.message : 'Local AI is unavailable.'
      };
    }
  }

  async listModels(): Promise<AIModelDescriptor[]> {
    return this.request<AIModelDescriptor[]>('/api/local-ai/models');
  }

  async loadModel(modelId: string): Promise<void> {
    if (!modelId.trim()) throw new Error('Select a model first.');
    const models = await this.listModels();
    if (!models.some(model => model.id === modelId)) {
      throw new Error('This model is not installed locally. Provision the model before disconnecting from the internet.');
    }
    // Ollama loads the already-installed model on the first chat request.
    this.activeModelId = modelId;
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const model = this.activeModelId;
    if (!model) throw new Error('Load a local model before starting a chat.');
    const response = await this.request<AIChatResponse>('/api/local-ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: request.conversation,
        temperature: request.temperature
      }),
      signal: request.signal
    });
    return response;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.activeModelId = undefined;
  }
}
