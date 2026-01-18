import * as vscode from 'vscode';
import { Pipeline } from '../pipeline/Pipeline';
import { OllamaService } from '../services/OllamaService';
import { FileTreeProvider } from './FileTreeProvider';
import { FunctionTreeProvider } from './FunctionTreeProvider';
import { PipelineStatus, WebviewMessage } from '../types';
import { Logger } from '../utils/logger';

export class SidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly pipeline: Pipeline,
        private readonly ollamaService: OllamaService,
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
                    await this.checkOllamaStatus();
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
            }
        });

        this.checkOllamaStatus();
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

    private async checkOllamaStatus(): Promise<void> {
        if (!this._view) {
            return;
        }

        const health = await this.ollamaService.checkHealth();
        this._view.webview.postMessage({
            type: 'ollamaStatus',
            payload: health
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
            <div class="section-title">Ollama Status</div>
            <div id="ollamaStatus" class="ollama-status disconnected">
                <span id="ollamaIcon">$(circle-slash)</span>
                <span id="ollamaText">Checking...</span>
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
                    <span>$(symbol-function)</span>
                    Extract Functions
                </button>
                <button id="generateBtn" class="primary">
                    <span>$(beaker)</span>
                    Generate Tests
                </button>
                <button id="clearBtn" class="secondary">
                    <span>$(clear-all)</span>
                    Clear Selection
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
            ollamaStatus: document.getElementById('ollamaStatus'),
            ollamaIcon: document.getElementById('ollamaIcon'),
            ollamaText: document.getElementById('ollamaText'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            progressBar: document.getElementById('progressBar'),
            filesCount: document.getElementById('filesCount'),
            functionsCount: document.getElementById('functionsCount'),
            extractBtn: document.getElementById('extractBtn'),
            generateBtn: document.getElementById('generateBtn'),
            clearBtn: document.getElementById('clearBtn'),
            errorSection: document.getElementById('errorSection'),
            errorMessage: document.getElementById('errorMessage')
        };

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
            if (health.status === 'ok') {
                elements.ollamaStatus.className = 'ollama-status connected';
                elements.ollamaText.textContent = 'Connected (' + (health.models?.length || 0) + ' models)';
            } else {
                elements.ollamaStatus.className = 'ollama-status disconnected';
                elements.ollamaText.textContent = health.error || 'Disconnected';
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
