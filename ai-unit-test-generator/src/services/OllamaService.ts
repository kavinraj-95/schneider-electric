import { ConfigService } from './ConfigService';
import { OllamaHealthResponse } from '../types';
import { Logger } from '../utils/logger';

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

export class OllamaService {
    private configService: ConfigService;

    constructor(configService: ConfigService) {
        this.configService = configService;
    }

    async checkHealth(): Promise<OllamaHealthResponse> {
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
                error: `Failed to connect to Ollama: ${message}`
            };
        }
    }

    async isModelAvailable(modelName?: string): Promise<boolean> {
        const health = await this.checkHealth();
        if (health.status !== 'ok' || !health.models) {
            return false;
        }

        const targetModel = modelName || this.configService.getOllamaModel();
        return health.models.some((m) =>
            m === targetModel || m.startsWith(`${targetModel}:`)
        );
    }

    async generate(prompt: string): Promise<string> {
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
}
