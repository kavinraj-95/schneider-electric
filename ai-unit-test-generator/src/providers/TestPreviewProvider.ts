import * as vscode from 'vscode';
import { ExtractedFunction, Scenario } from '../types';
import { CostService } from '../services/CostService';
import { Logger } from '../utils/logger';

export interface PreviewData {
    functions: ExtractedFunction[];
    scenarios: { [qualifiedName: string]: Scenario };
    estimatedCost: number;
}

export class TestPreviewProvider {
    private panel?: vscode.WebviewPanel;

    constructor(
        private context: vscode.ExtensionContext,
        private costService: CostService
    ) {}

    /**
     * Show test preview webview
     */
    async show(previewData: PreviewData): Promise<boolean> {
        Logger.log('Opening Test Preview');

        this.panel = vscode.window.createWebviewPanel(
            'testPreview',
            'Test Preview',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'media')
                ]
            }
        );

        this.panel.webview.html = this.getPreviewHtml(previewData);

        return new Promise((resolve) => {
            if (!this.panel) {
                resolve(false);
                return;
            }

            this.panel.webview.onDidReceiveMessage((message: any) => {
                if (message.type === 'approve-all') {
                    resolve(true);
                    this.panel?.dispose();
                } else if (message.type === 'cancel') {
                    resolve(false);
                    this.panel?.dispose();
                }
            });

            this.panel.onDidDispose(() => {
                resolve(false);
            });
        });
    }

    /**
     * Generate HTML content for preview
     */
    private getPreviewHtml(previewData: PreviewData): string {
        const scenarios = previewData.scenarios;
        const estimatedCost = previewData.estimatedCost;

        let scenariosHtml = '';
        for (const [qualifiedName, scenario] of Object.entries(scenarios)) {
            scenariosHtml += `
                <div class="scenario-card">
                    <h3>${this.escapeHtml(qualifiedName)}</h3>
                    <div class="scenario-content">
                        <div class="scenario-section">
                            <strong>Positive Scenarios:</strong>
                            <pre>${this.escapeHtml(scenario.positive)}</pre>
                        </div>
                        <div class="scenario-section">
                            <strong>Negative Scenarios:</strong>
                            <pre>${this.escapeHtml(scenario.negative)}</pre>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Test Preview</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        padding: 20px;
                    }

                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                    }

                    header {
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }

                    h1 {
                        font-size: 28px;
                        margin-bottom: 10px;
                    }

                    .info-bar {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        padding: 12px;
                        border-radius: 4px;
                        margin-bottom: 20px;
                        font-size: 13px;
                    }

                    .cost-estimate {
                        background: rgba(0, 122, 204, 0.1);
                        border: 1px solid #007ACC;
                        color: #007ACC;
                        padding: 8px 12px;
                        border-radius: 4px;
                    }

                    .scenario-list {
                        display: grid;
                        gap: 16px;
                        margin-bottom: 30px;
                    }

                    .scenario-card {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        overflow: hidden;
                    }

                    .scenario-card h3 {
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        padding: 12px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        font-size: 14px;
                    }

                    .scenario-content {
                        padding: 16px;
                    }

                    .scenario-section {
                        margin-bottom: 16px;
                    }

                    .scenario-section:last-child {
                        margin-bottom: 0;
                    }

                    .scenario-section strong {
                        display: block;
                        margin-bottom: 8px;
                        font-size: 12px;
                        color: var(--vscode-editor-inactiveSelectionBackground);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    pre {
                        background: var(--vscode-textCodeBlock-background);
                        padding: 12px;
                        border-radius: 4px;
                        overflow-x: auto;
                        font-size: 12px;
                        line-height: 1.4;
                        color: var(--vscode-editor-foreground);
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }

                    .actions {
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                        padding: 20px;
                        border-top: 1px solid var(--vscode-panel-border);
                        position: sticky;
                        bottom: 0;
                        background: var(--vscode-editor-background);
                    }

                    button {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        font-size: 13px;
                        cursor: pointer;
                        transition: background 0.2s;
                    }

                    .btn-approve {
                        background: #4EC9B0;
                        color: white;
                    }

                    .btn-approve:hover {
                        background: #36B89B;
                    }

                    .btn-cancel {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }

                    .btn-cancel:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }

                    .stats {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 16px;
                        margin-top: 20px;
                    }

                    .stat-box {
                        background: var(--vscode-textCodeBlock-background);
                        padding: 12px;
                        border-radius: 4px;
                        text-align: center;
                    }

                    .stat-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #007ACC;
                        margin-bottom: 4px;
                    }

                    .stat-label {
                        font-size: 12px;
                        color: var(--vscode-editor-inactiveSelectionBackground);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>Test Preview</h1>
                        <p style="color: var(--vscode-editor-inactiveSelectionBackground); font-size: 13px;">
                            Review the generated test scenarios before creating the test files
                        </p>
                    </header>

                    <div class="info-bar">
                        <div>
                            <strong>${previewData.functions.length}</strong> functions selected
                        </div>
                        <div class="cost-estimate">
                            Estimated cost: <strong>$${estimatedCost.toFixed(2)}</strong>
                        </div>
                    </div>

                    <div class="scenario-list">
                        ${scenariosHtml}
                    </div>

                    <div class="stats">
                        <div class="stat-box">
                            <div class="stat-value">${previewData.functions.length}</div>
                            <div class="stat-label">Functions</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">$${estimatedCost.toFixed(2)}</div>
                            <div class="stat-label">Est. Cost</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${Object.keys(scenarios).length}</div>
                            <div class="stat-label">Scenarios</div>
                        </div>
                    </div>

                    <div class="actions">
                        <button class="btn-cancel" onclick="cancel()">Cancel</button>
                        <button class="btn-approve" onclick="approveAll()">Generate Tests</button>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function approveAll() {
                        vscode.postMessage({
                            type: 'approve-all'
                        });
                    }

                    function cancel() {
                        vscode.postMessage({
                            type: 'cancel'
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (char) => map[char]);
    }
}
