import { ConfigService } from './ConfigService';
import { OllamaHealthResponse } from '../types';
import { Logger } from '../utils/logger';

type LLMProvider = 'openai' | 'ollama';

interface OllamaTagsResponse {
    models: Array<{
        name: string;
        size: number;
        digest: string;
        modified_at: string;
    }>;
}

interface OllamaGenerateResponse {
    model: string;
    response: string;
    done: boolean;
}

interface OpenAIModelsResponse {
    data: Array<{
        id: string;
        object: string;
        created: number;
        owned_by: string;
    }>;
}

export class LLMService {
    private configService: ConfigService;
    private provider: LLMProvider;

    constructor(configService: ConfigService) {
        this.configService = configService;
        this.provider = configService.getLLMProvider();
    }

    /**
     * Refresh the provider from config (useful when config changes)
     */
    refreshProvider(): void {
        this.provider = this.configService.getLLMProvider();
    }

    /**
     * Check health of the configured LLM provider
     */
    async checkHealth(): Promise<OllamaHealthResponse> {
        // Refresh provider in case config changed
        this.refreshProvider();

        if (this.provider === 'openai') {
            return this.checkOpenAIHealth();
        } else {
            return this.checkOllamaHealth();
        }
    }

    /**
     * Check OpenAI API health and connectivity
     */
    async checkOpenAIHealth(): Promise<OllamaHealthResponse> {
        const apiKey = this.configService.getOpenAIApiKey();

        if (!apiKey) {
            return {
                status: 'error',
                error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable or configure it in VS Code settings.'
            };
        }

        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                return {
                    status: 'error',
                    error: 'Invalid OpenAI API key. Please check your configuration.'
                };
            }

            if (response.status === 429) {
                return {
                    status: 'error',
                    error: 'OpenAI rate limit exceeded. Please try again later.'
                };
            }

            if (!response.ok) {
                return {
                    status: 'error',
                    error: `OpenAI API error: HTTP ${response.status} ${response.statusText}`
                };
            }

            const data = await response.json() as OpenAIModelsResponse;
            const models = data.data?.map((m) => m.id) || [];

            Logger.log(`OpenAI connected. Available models: ${models.slice(0, 5).join(', ')}...`);

            return {
                status: 'ok',
                models
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`OpenAI health check failed: ${message}`);

            return {
                status: 'error',
                error: `Failed to connect to OpenAI: ${message}. Check your internet connection.`
            };
        }
    }

    /**
     * Check Ollama API health and connectivity
     */
    async checkOllamaHealth(): Promise<OllamaHealthResponse> {
        const endpoint = this.configService.getOllamaEndpoint();

        try {
            const response = await fetch(`${endpoint}/api/tags`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                return {
                    status: 'error',
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }

            const data = await response.json() as OllamaTagsResponse;
            const models = data.models?.map((m) => m.name) || [];

            Logger.log(`Ollama connected. Available models: ${models.join(', ')}`);

            return {
                status: 'ok',
                models
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Ollama health check failed: ${message}`);

            return {
                status: 'error',
                error: `Failed to connect to Ollama at ${endpoint}: ${message}`
            };
        }
    }

    async isModelAvailable(modelName?: string): Promise<boolean> {
        const health = await this.checkHealth();
        if (health.status !== 'ok' || !health.models) {
            return false;
        }

        if (this.provider === 'openai') {
            const targetModel = modelName || this.configService.getOpenAIModel();
            return health.models.some((m) => m === targetModel);
        } else {
            const targetModel = modelName || this.configService.getOllamaModel();
            return health.models.some((m) =>
                m === targetModel || m.startsWith(`${targetModel}:`)
            );
        }
    }

    async generate(prompt: string): Promise<string> {
        if (this.provider === 'openai') {
            throw new Error('OpenAI generation through LLMService is not implemented. Use Python backend.');
        } else {
            return this.generateOllama(prompt);
        }
    }

    async generateOllama(prompt: string): Promise<string> {
        const endpoint = this.configService.getOllamaEndpoint();
        const model = this.configService.getOllamaModel();

        try {
            const response = await fetch(`${endpoint}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json() as OllamaGenerateResponse;
            return data.response;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Ollama generate failed: ${message}`);
            throw new Error(`Ollama generation failed: ${message}`);
        }
    }

    async pullModel(modelName?: string): Promise<void> {
        if (this.provider === 'openai') {
            return; // No-op for OpenAI
        }

        const endpoint = this.configService.getOllamaEndpoint();
        const model = modelName || this.configService.getOllamaModel();

        Logger.log(`Pulling model: ${model}`);

        try {
            const response = await fetch(`${endpoint}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: model })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            Logger.log(`Model ${model} pulled successfully`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Failed to pull model: ${message}`);
            throw new Error(`Failed to pull model: ${message}`);
        }
    }

    /**
     * Get the current provider name
     */
    getProvider(): LLMProvider {
        return this.provider;
    }

    /**
     * Get the current model name
     */
    getModel(): string {
        if (this.provider === 'openai') {
            return this.configService.getOpenAIModel();
        } else {
            return this.configService.getOllamaModel();
        }
    }
}
