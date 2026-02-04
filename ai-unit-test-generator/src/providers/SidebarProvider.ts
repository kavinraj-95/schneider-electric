import * as vscode from 'vscode';
import { Pipeline } from '../pipeline/Pipeline';
import { LLMService } from '../services/LLMService';
import { ConfigService } from '../services/ConfigService';
import { FileTreeProvider } from './FileTreeProvider';
import { FunctionTreeProvider } from './FunctionTreeProvider';
import { PipelineStatus, WebviewMessage } from '../types';
import { Logger } from '../utils/logger';

export class SidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly pipeline: Pipeline,
        private readonly llmService: LLMService,
        private readonly configService: ConfigService,
        private readonly fileTreeProvider: FileTreeProvider,
        private readonly functionTreeProvider: FunctionTreeProvider
    ) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'media')
            ]
        };

        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            switch (message.type) {
                case 'checkOllama':
                    await this.checkLLMStatus();
                    break;
                case 'extract':
                    await vscode.commands.executeCommand('aiUnitTesting.extractFunctions');
                    break;
                case 'generate':
                    await vscode.commands.executeCommand('aiUnitTesting.generateTests');
                    break;
                case 'clear':
                    await vscode.commands.executeCommand('aiUnitTesting.clearSelection');
                    break;
                case 'getStatus':
                    this.sendStats();
                    break;
                case 'runCoverage':
                    await vscode.commands.executeCommand('aiUnitTesting.runCoverage');
                    break;
                case 'switchProvider':
                    await this.switchProvider(message.payload as string);
                    break;
                case 'switchModel':
                    await this.switchModel(message.payload as string);
                    break;
            }
        });

        this.checkLLMStatus();
        this.sendStats();
    }

    updateStatus(status: PipelineStatus): void {
        if (!this._view) {
            return;
        }

        this._view.webview.postMessage({
            type: 'status',
            payload: status
        });
    }

    private async switchProvider(provider: string): Promise<void> {
        if (provider !== 'openai' && provider !== 'ollama') {
            return;
        }

        try {
            await this.configService.updateConfig('llmProvider', provider);
            vscode.window.showInformationMessage(`Switched to ${provider === 'openai' ? 'OpenAI' : 'Ollama'} provider`);
            await this.checkLLMStatus();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to switch provider: ${message}`);
        }
    }

    private async switchModel(model: string): Promise<void> {
        if (!model) {
            return;
        }

        try {
            const provider = this.configService.getLLMProvider();
            const configKey = provider === 'openai' ? 'openaiModel' : 'ollamaModel';
            await this.configService.updateConfig(configKey, model);
            vscode.window.showInformationMessage(`Switched to model: ${model}`);
            await this.checkLLMStatus();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to switch model: ${message}`);
        }
    }

    private async checkLLMStatus(): Promise<void> {
        if (!this._view) {
            return;
        }

        const provider = this.configService.getLLMProvider();
        const currentModel = provider === 'openai'
            ? this.configService.getOpenAIModel()
            : this.configService.getOllamaModel();
        const health = await this.llmService.checkHealth();

        this._view.webview.postMessage({
            type: 'ollamaStatus',
            payload: {
                ...health,
                provider,
                currentModel
            }
        });
    }

    private sendStats(): void {
        if (!this._view) {
            return;
        }

        this._view.webview.postMessage({
            type: 'stats',
            payload: {
                filesSelected: this.fileTreeProvider.getSelectedCount(),
                filesTotal: this.fileTreeProvider.getTotalCount(),
                functionsSelected: this.functionTreeProvider.getSelectedCount(),
                functionsTotal: this.functionTreeProvider.getTotalCount()
            }
        });
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'sidebar.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'unsafe-inline';">
    <link href="${styleUri}" rel="stylesheet">
    <title>AI Unit Test Generator</title>
</head>
<body>
    <div class="container">
        <div class="section">
            <div class="section-title">LLM Settings</div>
            <div class="llm-settings">
                <div class="setting-group">
                    <label for="providerSelect">Provider:</label>
                    <select id="providerSelect" class="select-input">
                        <option value="ollama">Ollama</option>
                        <option value="openai">OpenAI</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label for="modelSelect">Model:</label>
                    <select id="modelSelect" class="select-input">
                        <option value="">Loading models...</option>
                    </select>
                </div>
                <div id="llmStatus" class="llm-status disconnected">
                    <span id="llmIcon">⊘</span>
                    <span id="llmText">Checking...</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Pipeline Status</div>
            <div class="status-section">
                <div class="status-indicator">
                    <div id="statusDot" class="status-dot idle"></div>
                    <span id="statusText" class="status-text">Ready</span>
                </div>
                <div class="progress-container">
                    <div id="progressBar" class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Statistics</div>
            <div class="stats">
                <div class="stat-item">
                    <div id="filesCount" class="stat-value">0/0</div>
                    <div class="stat-label">Files</div>
                </div>
                <div class="stat-item">
                    <div id="functionsCount" class="stat-value">0/0</div>
                    <div class="stat-label">Functions</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Actions</div>
            <div class="button-group">
                <button id="extractBtn" class="primary">
                    <span>ƒₓ</span>
                    Extract Functions
                </button>
                <button id="generateBtn" class="primary">
                    <span>⚗</span>
                    Generate Tests
                </button>
                <button id="clearBtn" class="secondary">
                    <span>✕</span>
                    Clear Selection
                </button>
                <button id="coverageBtn" class="secondary">
                    <span>📊</span>
                    Run Coverage
                </button>
            </div>
        </div>

        <div id="errorSection" class="section" style="display: none;">
            <div class="error-message" id="errorMessage"></div>
        </div>

        <div class="section">
            <p class="info-text">
                Select Python files in the Source Files tree, extract functions,
                then generate AI-powered unit tests.
            </p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        const elements = {
            providerSelect: document.getElementById('providerSelect'),
            modelSelect: document.getElementById('modelSelect'),
            llmStatus: document.getElementById('llmStatus'),
            llmIcon: document.getElementById('llmIcon'),
            llmText: document.getElementById('llmText'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            progressBar: document.getElementById('progressBar'),
            filesCount: document.getElementById('filesCount'),
            functionsCount: document.getElementById('functionsCount'),
            extractBtn: document.getElementById('extractBtn'),
            generateBtn: document.getElementById('generateBtn'),
            clearBtn: document.getElementById('clearBtn'),
            coverageBtn: document.getElementById('coverageBtn'),
            errorSection: document.getElementById('errorSection'),
            errorMessage: document.getElementById('errorMessage')
        };

        // Provider selector handler
        elements.providerSelect.addEventListener('change', (e) => {
            const provider = e.target.value;
            vscode.postMessage({ type: 'switchProvider', payload: provider });
        });

        // Model selector handler
        elements.modelSelect.addEventListener('change', (e) => {
            const model = e.target.value;
            if (model) {
                vscode.postMessage({ type: 'switchModel', payload: model });
            }
        });

        // Button handlers
        elements.extractBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'extract' });
        });

        elements.generateBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'generate' });
        });

        elements.clearBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'clear' });
        });

        elements.coverageBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'runCoverage' });
        });

        // Message handler
        window.addEventListener('message', (event) => {
            const message = event.data;

            switch (message.type) {
                case 'ollamaStatus':
                    updateOllamaStatus(message.payload);
                    break;
                case 'status':
                    updatePipelineStatus(message.payload);
                    break;
                case 'stats':
                    updateStats(message.payload);
                    break;
                case 'error':
                    showError(message.payload);
                    break;
            }
        });

        function updateOllamaStatus(health) {
            // Update provider select
            if (health.provider) {
                elements.providerSelect.value = health.provider;
            }

            // Update model select
            if (health.models && health.models.length > 0) {
                elements.modelSelect.innerHTML = '';
                health.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    if (model === health.currentModel) {
                        option.selected = true;
                    }
                    elements.modelSelect.appendChild(option);
                });
            } else {
                elements.modelSelect.innerHTML = '<option value="">No models available</option>';
            }

            // Update status indicator
            if (health.status === 'ok') {
                elements.llmStatus.className = 'llm-status connected';
                elements.llmIcon.textContent = '✓';
                const providerName = health.provider === 'openai' ? 'OpenAI' : 'Ollama';
                elements.llmText.textContent = providerName + ' (' + (health.models?.length || 0) + ' models)';
            } else {
                elements.llmStatus.className = 'llm-status disconnected';
                elements.llmIcon.textContent = '⊘';
                elements.llmText.textContent = health.error || 'Disconnected';
            }
        }

        function updatePipelineStatus(status) {
            const stateMap = {
                'idle': { dot: 'idle', text: 'Ready' },
                'extracting': { dot: 'active', text: 'Extracting functions...' },
                'selecting': { dot: 'idle', text: 'Select functions to test' },
                'generating_scenarios': { dot: 'active', text: 'Generating scenarios...' },
                'generating_tests': { dot: 'active', text: 'Generating tests...' },
                'complete': { dot: 'success', text: 'Complete!' },
                'error': { dot: 'error', text: 'Error' }
            };

            const stateInfo = stateMap[status.state] || stateMap['idle'];
            elements.statusDot.className = 'status-dot ' + stateInfo.dot;
            elements.statusText.textContent = status.message || stateInfo.text;

            if (status.progress !== undefined) {
                elements.progressBar.style.width = status.progress + '%';
                elements.progressBar.className = 'progress-bar active';
            } else if (status.state === 'idle' || status.state === 'complete') {
                elements.progressBar.style.width = status.state === 'complete' ? '100%' : '0%';
                elements.progressBar.className = 'progress-bar';
            }

            if (status.error) {
                showError(status.error);
            } else {
                hideError();
            }

            const isProcessing = ['extracting', 'generating_scenarios', 'generating_tests'].includes(status.state);
            elements.extractBtn.disabled = isProcessing;
            elements.generateBtn.disabled = isProcessing;
        }

        function updateStats(stats) {
            elements.filesCount.textContent = stats.filesSelected + '/' + stats.filesTotal;
            elements.functionsCount.textContent = stats.functionsSelected + '/' + stats.functionsTotal;
        }

        function showError(message) {
            elements.errorSection.style.display = 'block';
            elements.errorMessage.textContent = message;
        }

        function hideError() {
            elements.errorSection.style.display = 'none';
        }

        // Initial status check
        vscode.postMessage({ type: 'checkOllama' });
        vscode.postMessage({ type: 'getStatus' });
    </script>
</body>
</html>`;
    }
}
