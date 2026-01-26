import { Pipeline } from '../../pipeline/Pipeline';
import { PythonBridge } from '../../services/PythonBridge';
import { OllamaService } from '../../services/OllamaService';
import { ConfigService } from '../../services/ConfigService';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../services/PythonBridge');
jest.mock('../../services/OllamaService');
jest.mock('../../services/ConfigService');

describe('Pipeline', () => {
    let pipeline: Pipeline;
    let mockPythonBridge: jest.Mocked<PythonBridge>;
    let mockOllamaService: jest.Mocked<OllamaService>;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPythonBridge = {
            checkPythonAvailable: jest.fn().mockResolvedValue(true),
            extractFunctions: jest.fn(),
            generateScenarios: jest.fn(),
            generateTests: jest.fn(),
            checkDependencies: jest.fn()
        } as any;

        mockOllamaService = {
            checkHealth: jest.fn(),
            isModelAvailable: jest.fn()
        } as any;

        mockConfigService = {
            getOllamaModel: jest.fn().mockReturnValue('llama3.2'),
            getTestOutputDir: jest.fn().mockReturnValue('tests')
        } as any;

        // Mock vscode workspace
        (vscode.workspace as any).workspaceFolders = [
            { uri: { fsPath: '/workspace' } }
        ];

        pipeline = new Pipeline(mockPythonBridge, mockOllamaService, mockConfigService);
    });

    describe('extractFunctions', () => {
        it('should successfully extract functions', async () => {
            const mockFunctions = [
                {
                    funcName: 'test_func',
                    qualifiedName: 'test_func',
                    isAsync: false,
                    funcSource: 'def test_func(): pass',
                    filePath: '/test/file.py',
                    lineStart: 1,
                    lineEnd: 2
                }
            ];
            mockPythonBridge.extractFunctions.mockResolvedValue(mockFunctions);

            const stateChangeSpy = jest.fn();
            pipeline.on('stateChange', stateChangeSpy);

            const result = await pipeline.extractFunctions(['/test/file.py']);

            expect(result).toEqual(mockFunctions);
            expect(mockPythonBridge.checkPythonAvailable).toHaveBeenCalled();
            expect(mockPythonBridge.extractFunctions).toHaveBeenCalledWith(['/test/file.py']);
            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({ state: 'extracting' })
            );
            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({ state: 'selecting' })
            );
        });

        it('should handle Python not available', async () => {
            mockPythonBridge.checkPythonAvailable.mockResolvedValue(false);

            const stateChangeSpy = jest.fn();
            pipeline.on('stateChange', stateChangeSpy);

            await expect(pipeline.extractFunctions(['/test/file.py'])).rejects.toThrow('Python is not available');

            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({ state: 'error' })
            );
        });

        it('should handle extraction errors', async () => {
            mockPythonBridge.extractFunctions.mockRejectedValue(new Error('Extraction failed'));

            const stateChangeSpy = jest.fn();
            pipeline.on('stateChange', stateChangeSpy);

            await expect(pipeline.extractFunctions(['/test/file.py'])).rejects.toThrow('Extraction failed');

            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    state: 'error',
                    error: 'Extraction failed'
                })
            );
        });
    });

    describe('generateTests', () => {
        const mockFunctions = [
            {
                funcName: 'test_func',
                qualifiedName: 'test_func',
                isAsync: false,
                funcSource: 'def test_func(): pass',
                filePath: '/test/file.py',
                lineStart: 1,
                lineEnd: 2
            }
        ];

        beforeEach(() => {
            mockOllamaService.checkHealth.mockResolvedValue({
                status: 'ok',
                models: ['llama3.2']
            });
            mockOllamaService.isModelAvailable.mockResolvedValue(true);
        });

        it('should successfully generate tests', async () => {
            const mockScenarios = {
                test_func: {
                    positive: 'scenario 1',
                    negative: 'scenario 2'
                }
            };
            const mockTests = [
                { functionName: 'test_func', testContent: 'def test_test_func(): pass', filePath: '/test/file.py' }
            ];

            mockPythonBridge.generateScenarios.mockImplementation(async (funcs, onProgress) => {
                if (onProgress) {
                    onProgress('test_func');
                }
                return mockScenarios;
            });

            mockPythonBridge.generateTests.mockImplementation(async (scenarios, onProgress) => {
                if (onProgress) {
                    onProgress('test_func');
                }
                return mockTests;
            });

            const stateChangeSpy = jest.fn();
            pipeline.on('stateChange', stateChangeSpy);

            const result = await pipeline.generateTests(mockFunctions);

            expect(result).toEqual(mockTests);
            expect(mockOllamaService.checkHealth).toHaveBeenCalled();
            expect(mockOllamaService.isModelAvailable).toHaveBeenCalled();
            expect(mockPythonBridge.generateScenarios).toHaveBeenCalledWith(
                mockFunctions,
                expect.any(Function)
            );
            expect(mockPythonBridge.generateTests).toHaveBeenCalledWith(
                mockScenarios,
                expect.any(Function)
            );
            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({ state: 'complete' })
            );
        });

        it('should throw error when no functions selected', async () => {
            await expect(pipeline.generateTests([])).rejects.toThrow('No functions selected');
        });

        it('should throw error when Ollama is not available', async () => {
            mockOllamaService.checkHealth.mockResolvedValue({
                status: 'error',
                error: 'Connection refused'
            });

            await expect(pipeline.generateTests(mockFunctions)).rejects.toThrow('Ollama is not available');
        });

        it('should throw error when model is not available', async () => {
            mockOllamaService.isModelAvailable.mockResolvedValue(false);

            await expect(pipeline.generateTests(mockFunctions)).rejects.toThrow('Model llama3.2 is not available');
        });

        it('should handle scenario generation errors', async () => {
            mockPythonBridge.generateScenarios.mockRejectedValue(new Error('Scenario generation failed'));

            const stateChangeSpy = jest.fn();
            pipeline.on('stateChange', stateChangeSpy);

            await expect(pipeline.generateTests(mockFunctions)).rejects.toThrow('Scenario generation failed');

            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    state: 'error',
                    error: expect.stringContaining('Scenario generation failed')
                })
            );
        });

        it('should handle test generation errors', async () => {
            const mockScenarios = {
                test_func: {
                    positive: 'scenario 1',
                    negative: 'scenario 2'
                }
            };
            mockPythonBridge.generateScenarios.mockResolvedValue(mockScenarios);
            mockPythonBridge.generateTests.mockRejectedValue(new Error('Test generation failed'));

            const stateChangeSpy = jest.fn();
            pipeline.on('stateChange', stateChangeSpy);

            await expect(pipeline.generateTests(mockFunctions)).rejects.toThrow('Test generation failed');

            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    state: 'error',
                    error: expect.stringContaining('Test generation failed')
                })
            );
        });

        it('should report progress during generation', async () => {
            const mockScenarios = {
                test_func: {
                    positive: 'scenario 1',
                    negative: 'scenario 2'
                }
            };
            const mockTests = [
                { functionName: 'test_func', testContent: 'def test_test_func(): pass', filePath: '/test/file.py' }
            ];

            mockPythonBridge.generateScenarios.mockImplementation(async (funcs, onProgress) => {
                if (onProgress) {
                    onProgress('test_func');
                }
                return mockScenarios;
            });

            mockPythonBridge.generateTests.mockImplementation(async (scenarios, onProgress) => {
                if (onProgress) {
                    onProgress('test_func');
                }
                return mockTests;
            });

            const stateChangeSpy = jest.fn();
            pipeline.on('stateChange', stateChangeSpy);

            await pipeline.generateTests(mockFunctions);

            // Check that progress was reported
            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    state: 'generating_scenarios',
                    progress: expect.any(Number)
                })
            );
            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    state: 'generating_tests',
                    progress: expect.any(Number)
                })
            );
        });
    });

    describe('getState', () => {
        it('should return current state', () => {
            expect(pipeline.getState()).toBe('idle');
        });
    });

    describe('reset', () => {
        it('should reset pipeline to idle state', async () => {
            const stateChangeSpy = jest.fn();
            pipeline.on('stateChange', stateChangeSpy);

            pipeline.reset();

            expect(stateChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({ state: 'idle' })
            );
            expect(pipeline.getState()).toBe('idle');
        });
    });
});
