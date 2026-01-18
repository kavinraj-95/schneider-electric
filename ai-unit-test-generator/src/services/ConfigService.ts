import * as vscode from 'vscode';
import { ExtensionConfig } from '../types';

export class ConfigService {
    private static readonly CONFIG_SECTION = 'aiUnitTesting';

    getConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);

        return {
            ollamaEndpoint: config.get<string>('ollamaEndpoint', 'http://localhost:11434'),
            ollamaModel: config.get<string>('ollamaModel', 'llama3.2'),
            testOutputDir: config.get<string>('testOutputDir', 'tests'),
            pythonPath: config.get<string>('pythonPath', 'python3')
        };
    }

    getOllamaEndpoint(): string {
        return this.getConfig().ollamaEndpoint;
    }

    getOllamaModel(): string {
        return this.getConfig().ollamaModel;
    }

    getTestOutputDir(): string {
        return this.getConfig().testOutputDir;
    }

    getPythonPath(): string {
        return this.getConfig().pythonPath;
    }

    async updateConfig<K extends keyof ExtensionConfig>(
        key: K,
        value: ExtensionConfig[K]
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
        await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }

    onConfigChange(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ConfigService.CONFIG_SECTION)) {
                callback(e);
            }
        });
    }
}
