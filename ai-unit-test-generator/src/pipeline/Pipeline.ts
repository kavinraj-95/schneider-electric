import * as vscode from 'vscode';
import * as path from 'path';
import { EventEmitter } from 'events';
import { PythonBridge } from '../services/PythonBridge';
import { LLMService } from '../services/LLMService';
import { ConfigService } from '../services/ConfigService';
import {
    ExtractedFunction,
    ScenariosResult,
    GeneratedTest,
    PipelineState,
    PipelineStatus
} from '../types';
import {
    getTestFilePath,
    ensureDirectoryExists,
    extractPythonCodeBlock,
    generateTestFileContent
} from '../utils/testFileUtils';
import { Logger } from '../utils/logger';

export class Pipeline extends EventEmitter {
    private state: PipelineState = 'idle';
    private pythonBridge: PythonBridge;
    private llmService: LLMService;
    private configService: ConfigService;

    constructor(
        pythonBridge: PythonBridge,
        llmService: LLMService,
        configService: ConfigService
    ) {
        super();
        this.pythonBridge = pythonBridge;
        this.llmService = llmService;
        this.configService = configService;
    }

    private setState(state: PipelineState, message?: string, progress?: number): void {
        this.state = state;
        const status: PipelineStatus = {
            state,
            message: message || this.getDefaultMessage(state),
            progress
        };
        this.emit('stateChange', status);
    }

    private setError(error: string): void {
        const status: PipelineStatus = {
            state: 'error',
            message: 'Error occurred',
            error
        };
        this.state = 'error';
        this.emit('stateChange', status);
    }

    private getDefaultMessage(state: PipelineState): string {
        const messages: Record<PipelineState, string> = {
            idle: 'Ready',
            extracting: 'Extracting functions...',
            selecting: 'Select functions to test',
            generating_scenarios: 'Generating test scenarios...',
            generating_tests: 'Generating unit tests...',
            complete: 'Complete!',
            error: 'An error occurred'
        };
        return messages[state];
    }

    async extractFunctions(filePaths: string[]): Promise<ExtractedFunction[]> {
        this.setState('extracting', `Extracting from ${filePaths.length} files...`);

        try {
            const pythonAvailable = await this.pythonBridge.checkPythonAvailable();
            if (!pythonAvailable) {
                throw new Error('Python is not available. Please check your Python path in settings.');
            }

            const functions = await this.pythonBridge.extractFunctions(filePaths);
            this.setState('selecting', `Extracted ${functions.length} functions`);
            return functions;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.setError(message);
            throw error;
        }
    }

    async generateTests(functions: ExtractedFunction[]): Promise<GeneratedTest[]> {
        if (functions.length === 0) {
            throw new Error('No functions selected');
        }

        const health = await this.llmService.checkHealth();
        if (health.status !== 'ok') {
            throw new Error(`LLM provider is not available: ${health.error}`);
        }

        const modelAvailable = await this.llmService.isModelAvailable();
        if (!modelAvailable) {
            const model = this.llmService.getModel();
            throw new Error(`Model ${model} is not available`);
        }

        let completedScenarios = 0;
        const totalFunctions = functions.length;

        this.setState(
            'generating_scenarios',
            `Generating scenarios (0/${totalFunctions})...`,
            0
        );

        let scenarios: ScenariosResult;
        try {
            scenarios = await this.pythonBridge.generateScenarios(functions, (funcName) => {
                completedScenarios++;
                const progress = Math.round((completedScenarios / totalFunctions) * 50);
                this.setState(
                    'generating_scenarios',
                    `Generating scenarios (${completedScenarios}/${totalFunctions})...`,
                    progress
                );
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.setError(`Scenario generation failed: ${message}`);
            throw error;
        }

        let completedTests = 0;
        this.setState(
            'generating_tests',
            `Generating tests (0/${totalFunctions})...`,
            50
        );

        let tests: GeneratedTest[];
        try {
            tests = await this.pythonBridge.generateTests(scenarios, (funcName) => {
                completedTests++;
                const progress = 50 + Math.round((completedTests / totalFunctions) * 50);
                this.setState(
                    'generating_tests',
                    `Generating tests (${completedTests}/${totalFunctions})...`,
                    progress
                );
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.setError(`Test generation failed: ${message}`);
            throw error;
        }

        try {
            await this.saveTests(tests);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.setError(`Failed to save tests: ${message}`);
            throw error;
        }

        this.setState('complete', `Generated ${tests.length} test files`, 100);
        return tests;
    }

    private async saveTests(tests: GeneratedTest[]): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const testOutputDir = this.configService.getTestOutputDir();

        const testsByFile = new Map<string, string[]>();

        for (const test of tests) {
            if (!test.testContent || !test.filePath) {
                continue;
            }

            const testFilePath = getTestFilePath(
                test.filePath,
                workspaceRoot,
                testOutputDir
            );

            if (!testsByFile.has(testFilePath)) {
                testsByFile.set(testFilePath, []);
            }

            const cleanedCode = extractPythonCodeBlock(test.testContent);
            testsByFile.get(testFilePath)!.push(cleanedCode);
        }

        for (const [testFilePath, testCodes] of testsByFile) {
            const dirPath = path.dirname(testFilePath);
            await ensureDirectoryExists(dirPath);

            const imports = [
                'import pytest',
                `import sys`,
                `import os`,
                `sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))`
            ];

            const combinedCode = testCodes.join('\n\n');
            const fileContent = generateTestFileContent(
                imports,
                combinedCode,
                testFilePath
            );

            const uri = vscode.Uri.file(testFilePath);
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(fileContent));

            Logger.log(`Saved test file: ${testFilePath}`);
        }
    }

    getState(): PipelineState {
        return this.state;
    }

    reset(): void {
        this.setState('idle');
    }
}
