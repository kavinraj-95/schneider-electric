import { PythonBridge } from '../../services/PythonBridge';
import { ConfigService } from '../../services/ConfigService';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('child_process');
jest.mock('../../services/ConfigService');
jest.mock('fs');

describe('PythonBridge', () => {
    let pythonBridge: PythonBridge;
    let mockConfigService: jest.Mocked<ConfigService>;
    let mockProcess: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConfigService = {
            getPythonPath: jest.fn().mockReturnValue('python3'),
        } as any;

        mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.stdin = {
            write: jest.fn(),
            end: jest.fn()
        };

        (spawn as jest.Mock).mockReturnValue(mockProcess);

        pythonBridge = new PythonBridge('/test/extension/path', mockConfigService);
    });

    describe('extractFunctions', () => {
        it('should successfully extract functions from files', async () => {
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

            const extractPromise = pythonBridge.extractFunctions(['/test/file.py']);

            // Simulate successful Python process
            setTimeout(() => {
                mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockFunctions)));
                mockProcess.emit('close', 0);
            }, 10);

            const result = await extractPromise;

            expect(result).toEqual(mockFunctions);
            expect(spawn).toHaveBeenCalledWith(
                'python3',
                expect.arrayContaining([expect.stringContaining('extract_functions.py')]),
                expect.any(Object)
            );
        });

        it('should handle Python process errors', async () => {
            const extractPromise = pythonBridge.extractFunctions(['/test/file.py']);

            setTimeout(() => {
                mockProcess.emit('error', new Error('Python not found'));
            }, 10);

            await expect(extractPromise).rejects.toThrow('Failed to start Python');
        });

        it('should handle Python script failures', async () => {
            const extractPromise = pythonBridge.extractFunctions(['/test/file.py']);

            setTimeout(() => {
                mockProcess.stderr.emit('data', Buffer.from('Error: File not found'));
                mockProcess.emit('close', 1);
            }, 10);

            await expect(extractPromise).rejects.toThrow('Python script failed');
        });
    });

    describe('generateScenarios', () => {
        it('should successfully generate scenarios', async () => {
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
            const mockScenarios = {
                test_func: {
                    positive: 'scenario 1',
                    negative: 'scenario 2'
                }
            };

            const progressCallback = jest.fn();
            const generatePromise = pythonBridge.generateScenarios(mockFunctions, progressCallback);

            setTimeout(() => {
                mockProcess.stderr.emit('data', Buffer.from(JSON.stringify({ type: 'progress', function: 'test_func' }) + '\n'));
                mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockScenarios)));
                mockProcess.emit('close', 0);
            }, 10);

            const result = await generatePromise;

            expect(result).toEqual(mockScenarios);
            expect(progressCallback).toHaveBeenCalledWith('test_func');
        });

        it('should handle scenarios without progress callback', async () => {
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
            const mockScenarios = {
                test_func: {
                    positive: 'scenario 1',
                    negative: 'scenario 2'
                }
            };

            const generatePromise = pythonBridge.generateScenarios(mockFunctions);

            setTimeout(() => {
                mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockScenarios)));
                mockProcess.emit('close', 0);
            }, 10);

            const result = await generatePromise;

            expect(result).toEqual(mockScenarios);
        });
    });

    describe('generateTests', () => {
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

            const progressCallback = jest.fn();
            const generatePromise = pythonBridge.generateTests(mockScenarios, progressCallback);

            setTimeout(() => {
                mockProcess.stderr.emit('data', Buffer.from(JSON.stringify({ type: 'progress', function: 'test_func' }) + '\n'));
                mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockTests)));
                mockProcess.emit('close', 0);
            }, 10);

            const result = await generatePromise;

            expect(result).toEqual(mockTests);
            expect(progressCallback).toHaveBeenCalledWith('test_func');
        });
    });

    describe('checkPythonAvailable', () => {
        it('should return true when Python is available', async () => {
            const checkPromise = pythonBridge.checkPythonAvailable();

            setTimeout(() => {
                mockProcess.emit('close', 0);
            }, 10);

            const result = await checkPromise;

            expect(result).toBe(true);
            expect(spawn).toHaveBeenCalledWith('python3', ['--version']);
        });

        it('should return false when Python is not available', async () => {
            const checkPromise = pythonBridge.checkPythonAvailable();

            setTimeout(() => {
                mockProcess.emit('error', new Error('Command not found'));
            }, 10);

            const result = await checkPromise;

            expect(result).toBe(false);
        });

        it('should return false when Python exits with non-zero code', async () => {
            const checkPromise = pythonBridge.checkPythonAvailable();

            setTimeout(() => {
                mockProcess.emit('close', 1);
            }, 10);

            const result = await checkPromise;

            expect(result).toBe(false);
        });
    });

    describe('checkDependencies', () => {
        it('should return available true when all dependencies are installed', async () => {
            const checkPromise = pythonBridge.checkDependencies();

            setTimeout(() => {
                mockProcess.stdout.emit('data', Buffer.from(''));
                mockProcess.emit('close', 0);
            }, 10);

            const result = await checkPromise;

            expect(result.available).toBe(true);
            expect(result.missing).toEqual([]);
        });

        it('should return missing dependencies', async () => {
            const checkPromise = pythonBridge.checkDependencies();

            setTimeout(() => {
                mockProcess.stdout.emit('data', Buffer.from('langchain,langgraph'));
                mockProcess.emit('close', 0);
            }, 10);

            const result = await checkPromise;

            expect(result.available).toBe(false);
            expect(result.missing).toEqual(['langchain', 'langgraph']);
        });

        it('should handle Python execution errors', async () => {
            const checkPromise = pythonBridge.checkDependencies();

            setTimeout(() => {
                mockProcess.emit('error', new Error('Python error'));
            }, 10);

            const result = await checkPromise;

            expect(result.available).toBe(false);
            expect(result.missing).toEqual([]);
        });

        it('should handle non-zero exit codes', async () => {
            const checkPromise = pythonBridge.checkDependencies();

            setTimeout(() => {
                mockProcess.emit('close', 1);
            }, 10);

            const result = await checkPromise;

            expect(result.available).toBe(false);
        });
    });
});
