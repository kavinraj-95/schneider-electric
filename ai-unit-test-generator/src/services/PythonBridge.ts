import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { ConfigService } from './ConfigService';
import { ExtractedFunction, ScenariosResult, GeneratedTest } from '../types';
import { Logger } from '../utils/logger';

export class PythonBridge {
    private extensionPath: string;
    private configService: ConfigService;
    private pythonDir: string;

    constructor(extensionPath: string, configService: ConfigService) {
        this.extensionPath = extensionPath;
        this.configService = configService;
        this.pythonDir = path.join(extensionPath, 'python');
    }

    private getPythonPath(): string {
        // First check if user configured a custom path
        const configuredPath = this.configService.getPythonPath();
        if (configuredPath !== 'python3' && configuredPath !== 'python') {
            return configuredPath;
        }

        // Check for venv in the python directory
        const venvPython = path.join(this.pythonDir, '.venv', 'bin', 'python');
        if (fs.existsSync(venvPython)) {
            Logger.log(`Using venv Python: ${venvPython}`);
            return venvPython;
        }

        // Fallback to configured path
        return configuredPath;
    }

    async extractFunctions(filePaths: string[]): Promise<ExtractedFunction[]> {
        const scriptPath = path.join(this.pythonDir, 'extract_functions.py');
        const input = JSON.stringify({ files: filePaths });

        const result = await this.runPythonScript(scriptPath, input);
        return JSON.parse(result) as ExtractedFunction[];
    }

    async generateScenarios(
        functions: ExtractedFunction[],
        onProgress?: (funcName: string) => void
    ): Promise<ScenariosResult> {
        const scriptPath = path.join(this.pythonDir, 'generate_scenarios.py');
        const input = JSON.stringify({ functions });

        const result = await this.runPythonScript(scriptPath, input, (line) => {
            try {
                const progress = JSON.parse(line);
                if (progress.type === 'progress' && onProgress) {
                    onProgress(progress.function);
                }
            } catch {
                // Not a progress message, ignore
            }
        });

        return JSON.parse(result) as ScenariosResult;
    }

    async generateTests(
        scenarios: ScenariosResult,
        onProgress?: (funcName: string) => void
    ): Promise<GeneratedTest[]> {
        const scriptPath = path.join(this.pythonDir, 'generate_unit_tests.py');
        const input = JSON.stringify({ scenarios });

        const result = await this.runPythonScript(scriptPath, input, (line) => {
            try {
                const progress = JSON.parse(line);
                if (progress.type === 'progress' && onProgress) {
                    onProgress(progress.function);
                }
            } catch {
                // Not a progress message, ignore
            }
        });

        return JSON.parse(result) as GeneratedTest[];
    }

    private runPythonScript(
        scriptPath: string,
        input: string,
        onStderr?: (line: string) => void
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const pythonPath = this.getPythonPath();

            Logger.log(`Running Python script: ${scriptPath}`);
            Logger.log(`Python path: ${pythonPath}`);

            const process = spawn(pythonPath, [scriptPath], {
                cwd: this.pythonDir,
                env: {
                    ...globalThis.process.env,
                    PYTHONUNBUFFERED: '1'
                }
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n').filter(Boolean);
                lines.forEach((line) => {
                    stderr += line + '\n';
                    if (onStderr) {
                        onStderr(line);
                    }
                });
            });

            process.on('error', (error: Error) => {
                Logger.error(`Python process error: ${error.message}`);
                reject(new Error(`Failed to start Python: ${error.message}`));
            });

            process.on('close', (code: number | null) => {
                if (code === 0) {
                    Logger.log('Python script completed successfully');
                    resolve(stdout.trim());
                } else {
                    Logger.error(`Python script failed with code ${code}: ${stderr}`);
                    reject(new Error(`Python script failed: ${stderr || `Exit code ${code}`}`));
                }
            });

            process.stdin.write(input);
            process.stdin.end();
        });
    }

    async checkPythonAvailable(): Promise<boolean> {
        return new Promise((resolve) => {
            const pythonPath = this.getPythonPath();
            const process = spawn(pythonPath, ['--version']);

            process.on('error', () => {
                resolve(false);
            });

            process.on('close', (code) => {
                resolve(code === 0);
            });
        });
    }

    async checkDependencies(): Promise<{ available: boolean; missing: string[] }> {
        const pythonPath = this.getPythonPath();
        const checkScript = `
import sys
missing = []
try:
    import langchain
except ImportError:
    missing.append('langchain')
try:
    import langgraph
except ImportError:
    missing.append('langgraph')
try:
    import langsmith
except ImportError:
    missing.append('langsmith')
try:
    import dotenv
except ImportError:
    missing.append('python-dotenv')
print(','.join(missing) if missing else '')
`;

        return new Promise((resolve) => {
            const process = spawn(pythonPath, ['-c', checkScript]);
            let output = '';

            process.stdout.on('data', (data: Buffer) => {
                output += data.toString();
            });

            process.on('error', () => {
                resolve({ available: false, missing: [] });
            });

            process.on('close', (code) => {
                if (code === 0) {
                    const missing = output.trim().split(',').filter(Boolean);
                    resolve({ available: missing.length === 0, missing });
                } else {
                    resolve({ available: false, missing: [] });
                }
            });
        });
    }
}
