import { OllamaService } from '../../services/OllamaService';
import { ConfigService } from '../../services/ConfigService';

// Mock ConfigService
jest.mock('../../services/ConfigService');

// Mock global fetch
global.fetch = jest.fn();

describe('OllamaService', () => {
    let ollamaService: OllamaService;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfigService = {
            getOllamaEndpoint: jest.fn().mockReturnValue('http://localhost:11434'),
            getOllamaModel: jest.fn().mockReturnValue('llama3.2'),
        } as any;
        ollamaService = new OllamaService(mockConfigService);
    });

    describe('checkHealth', () => {
        it('should return ok status when Ollama is available', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    models: [
                        { name: 'llama3.2', size: 1000, digest: 'abc', modified_at: '2024-01-01' }
                    ]
                })
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await ollamaService.checkHealth();

            expect(result.status).toBe('ok');
            expect(result.models).toEqual(['llama3.2']);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/tags',
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should return error status when Ollama is not available', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

            const result = await ollamaService.checkHealth();

            expect(result.status).toBe('error');
            expect(result.error).toContain('Connection refused');
        });

        it('should handle HTTP error responses', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await ollamaService.checkHealth();

            expect(result.status).toBe('error');
            expect(result.error).toContain('404');
        });
    });

    describe('isModelAvailable', () => {
        it('should return true when model is available', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    models: [
                        { name: 'llama3.2', size: 1000, digest: 'abc', modified_at: '2024-01-01' }
                    ]
                })
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await ollamaService.isModelAvailable('llama3.2');

            expect(result).toBe(true);
        });

        it('should return false when model is not available', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    models: [
                        { name: 'other-model', size: 1000, digest: 'abc', modified_at: '2024-01-01' }
                    ]
                })
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await ollamaService.isModelAvailable('llama3.2');

            expect(result).toBe(false);
        });

        it('should return false when health check fails', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

            const result = await ollamaService.isModelAvailable();

            expect(result).toBe(false);
        });

        it('should handle model name with tags', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    models: [
                        { name: 'llama3.2:latest', size: 1000, digest: 'abc', modified_at: '2024-01-01' }
                    ]
                })
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await ollamaService.isModelAvailable('llama3.2');

            expect(result).toBe(true);
        });
    });

    describe('generate', () => {
        it('should successfully generate text', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    model: 'llama3.2',
                    response: 'Generated text',
                    done: true
                })
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await ollamaService.generate('Test prompt');

            expect(result).toBe('Generated text');
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/generate',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('Test prompt')
                })
            );
        });

        it('should throw error when generation fails', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(ollamaService.generate('Test prompt')).rejects.toThrow('Ollama generation failed');
        });

        it('should handle HTTP error responses', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await expect(ollamaService.generate('Test prompt')).rejects.toThrow('500');
        });
    });

    describe('pullModel', () => {
        it('should successfully pull a model', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({})
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await expect(ollamaService.pullModel('llama3.2')).resolves.not.toThrow();

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/pull',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('llama3.2')
                })
            );
        });

        it('should throw error when pull fails', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(ollamaService.pullModel('llama3.2')).rejects.toThrow('Failed to pull model');
        });

        it('should use default model when none specified', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({})
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await ollamaService.pullModel();

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/pull',
                expect.objectContaining({
                    body: expect.stringContaining('llama3.2')
                })
            );
        });
    });
});
