import * as vscode from 'vscode';
import { ExtensionConfig } from '../types';

export class ConfigService {
    private static readonly CONFIG_SECTION = 'aiUnitTesting';

    getConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);

        return {
            llmProvider: config.get<'openai' | 'ollama'>('llmProvider', 'openai'),
            openaiApiKey: config.get<string>('openaiApiKey', ''),
            openaiModel: config.get<string>('openaiModel', 'gpt-4o'),
            openaiOrganization: config.get<string>('openaiOrganization', ''),
            ollamaEndpoint: config.get<string>('ollamaEndpoint', 'http://localhost:11434'),
            ollamaModel: config.get<string>('ollamaModel', 'llama3.2'),
            testOutputDir: config.get<string>('testOutputDir', 'tests'),
            pythonPath: config.get<string>('pythonPath', 'python3')
        };
    }

    getLLMProvider(): 'openai' | 'ollama' {
        return this.getConfig().llmProvider;
    }

    getOpenAIApiKey(): string {
        // Check environment variable first, then config
        const envKey = process.env.OPENAI_API_KEY;
        if (envKey) {
            return envKey;
        }
        return this.getConfig().openaiApiKey;
    }

    getOpenAIModel(): string {
        return this.getConfig().openaiModel;
    }

    getOpenAIOrganization(): string | undefined {
        const org = this.getConfig().openaiOrganization;
        return org ? org : undefined;
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
