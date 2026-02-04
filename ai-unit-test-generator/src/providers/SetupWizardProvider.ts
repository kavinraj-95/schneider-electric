import * as vscode from 'vscode';
import { ConfigService } from '../services/ConfigService';
import { LLMService } from '../services/LLMService';
import { EnvironmentService } from '../services/EnvironmentService';
import { Logger } from '../utils/logger';

interface WizardStep {
    id: string;
    title: string;
    description: string;
    order: number;
}

export class SetupWizardProvider {
    private static readonly STEPS: WizardStep[] = [
        {
            id: 'welcome',
            title: 'Welcome to AI Unit Test Generator',
            description: 'Let\'s set up your AI-powered test generation environment',
            order: 1
        },
        {
            id: 'provider-selection',
            title: 'Choose LLM Provider',
            description: 'Select between OpenAI (recommended) or Ollama',
            order: 2
        },
        {
            id: 'api-key',
            title: 'Configure API Key',
            description: 'Enter your OpenAI API key',
            order: 3
        },
        {
            id: 'python-check',
            title: 'Check Python Environment',
            description: 'Verifying Python and dependencies',
            order: 4
        },
        {
            id: 'dependencies',
            title: 'Install Dependencies',
            description: 'Setting up required Python packages',
            order: 5
        },
        {
            id: 'test-connection',
            title: 'Test Connection',
            description: 'Verifying your LLM provider is working',
            order: 6
        },
        {
            id: 'complete',
            title: 'Setup Complete!',
            description: 'You\'re ready to generate tests',
            order: 7
        }
    ];

    constructor(
        private context: vscode.ExtensionContext,
        private configService: ConfigService,
        private llmService: LLMService,
        private environmentService: EnvironmentService
    ) {}

    /**
     * Show the setup wizard
     */
    async show(): Promise<boolean> {
        Logger.log('Opening Setup Wizard');

        const panel = vscode.window.createWebviewPanel(
            'setupWizard',
            'Setup Wizard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'media')
                ]
            }
        );

        panel.webview.html = this.getWizardHtml();

        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage(
                async (message: any) => {
                    await this.handleWizardMessage(message, panel);
                    if (message.type === 'complete' && message.success) {
                        resolve(true);
                        panel.dispose();
                    }
                }
            );

            panel.onDidDispose(() => {
                resolve(false);
            });
        });
    }

    /**
     * Handle wizard step messages
     */
    private async handleWizardMessage(message: any, panel: vscode.WebviewPanel): Promise<void> {
        switch (message.type) {
            case 'select-provider':
                await this.handleProviderSelection(message.provider, panel);
                break;

            case 'validate-api-key':
                await this.handleApiKeyValidation(message.apiKey, panel);
                break;

            case 'check-environment':
                await this.handleEnvironmentCheck(panel);
                break;

            case 'install-dependencies':
                await this.handleDependencyInstallation(panel);
                break;

            case 'test-connection':
                await this.handleConnectionTest(panel);
                break;

            case 'complete':
                await this.handleWizardCompletion(message, panel);
                break;
        }
    }

    /**
     * Handle provider selection
     */
    private async handleProviderSelection(provider: 'openai' | 'ollama', panel: vscode.WebviewPanel): Promise<void> {
        try {
            await this.configService.updateConfig('llmProvider', provider);
            Logger.log(`Provider selected: ${provider}`);

            panel.webview.postMessage({
                type: 'provider-selected',
                provider,
                success: true
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Provider selection failed: ${message}`);

            panel.webview.postMessage({
                type: 'provider-selected',
                success: false,
                error: message
            });
        }
    }

    /**
     * Validate OpenAI API key
     */
    private async handleApiKeyValidation(apiKey: string, panel: vscode.WebviewPanel): Promise<void> {
        if (!apiKey || apiKey.trim().length === 0) {
            panel.webview.postMessage({
                type: 'api-key-validated',
                success: false,
                error: 'API key cannot be empty'
            });
            return;
        }

        try {
            // Save the API key temporarily to test it
            await this.configService.updateConfig('openaiApiKey', apiKey);

            // Create a temporary LLMService to test the key
            const tempLLMService = new LLMService(this.configService);
            const health = await tempLLMService.checkOpenAIHealth();

            if (health.status === 'ok') {
                Logger.log('OpenAI API key validated successfully');
                panel.webview.postMessage({
                    type: 'api-key-validated',
                    success: true,
                    message: 'API key is valid!'
                });
            } else {
                await this.configService.updateConfig('openaiApiKey', '');
                Logger.error(`API key validation failed: ${health.error}`);

                panel.webview.postMessage({
                    type: 'api-key-validated',
                    success: false,
                    error: health.error || 'Invalid API key'
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`API key validation error: ${message}`);

            panel.webview.postMessage({
                type: 'api-key-validated',
                success: false,
                error: message
            });
        }
    }

    /**
     * Check Python environment
     */
    private async handleEnvironmentCheck(panel: vscode.WebviewPanel): Promise<void> {
        try {
            const envCheck = await this.environmentService.checkEnvironment();

            panel.webview.postMessage({
                type: 'environment-checked',
                success: envCheck.isValid,
                environment: envCheck
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Environment check failed: ${message}`);

            panel.webview.postMessage({
                type: 'environment-checked',
                success: false,
                error: message
            });
        }
    }

    /**
     * Install dependencies
     */
    private async handleDependencyInstallation(panel: vscode.WebviewPanel): Promise<void> {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Installing dependencies...',
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ increment: 0, message: 'Starting installation...' });

                    const updateProgress = (message: string, increment: number) => {
                        progress.report({ increment, message });
                        panel.webview.postMessage({
                            type: 'installation-progress',
                            message
                        });
                    };

                    await this.environmentService.installDependencies(updateProgress);
                }
            );

            Logger.log('Dependencies installed successfully');

            panel.webview.postMessage({
                type: 'dependencies-installed',
                success: true,
                message: 'Dependencies installed successfully!'
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Dependency installation failed: ${message}`);

            panel.webview.postMessage({
                type: 'dependencies-installed',
                success: false,
                error: message
            });
        }
    }

    /**
     * Test LLM provider connection
     */
    private async handleConnectionTest(panel: vscode.WebviewPanel): Promise<void> {
        try {
            const health = await this.llmService.checkHealth();

            if (health.status === 'ok') {
                Logger.log('LLM provider connection successful');
                panel.webview.postMessage({
                    type: 'connection-tested',
                    success: true,
                    provider: this.configService.getLLMProvider(),
                    model: this.llmService.getModel(),
                    message: 'Connection successful!'
                });
            } else {
                Logger.error(`Connection test failed: ${health.error}`);
                panel.webview.postMessage({
                    type: 'connection-tested',
                    success: false,
                    error: health.error || 'Connection failed'
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Connection test error: ${message}`);

            panel.webview.postMessage({
                type: 'connection-tested',
                success: false,
                error: message
            });
        }
    }

    /**
     * Handle wizard completion
     */
    private async handleWizardCompletion(message: any, panel: vscode.WebviewPanel): Promise<void> {
        try {
            // Mark wizard as completed
            this.context.globalState.update('setupWizardCompleted', true);
            Logger.log('Setup wizard completed successfully');

            panel.webview.postMessage({
                type: 'completion-confirmed',
                success: true
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Wizard completion error: ${msg}`);
        }
    }

    /**
     * Generate HTML content for the wizard
     */
    private getWizardHtml(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Setup Wizard</title>
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
                        padding: 40px 20px;
                    }

                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                    }

                    .wizard-container {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 40px;
                    }

                    .progress-bar {
                        display: flex;
                        margin-bottom: 30px;
                        gap: 8px;
                    }

                    .step {
                        flex: 1;
                        height: 4px;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 2px;
                        transition: background 0.3s;
                    }

                    .step.active {
                        background: #007ACC;
                    }

                    .step.completed {
                        background: #4EC9B0;
                    }

                    h1 {
                        font-size: 24px;
                        margin-bottom: 10px;
                        color: var(--vscode-editor-foreground);
                    }

                    .description {
                        color: var(--vscode-editor-inactiveSelectionBackground);
                        margin-bottom: 30px;
                        font-size: 14px;
                    }

                    .content {
                        min-height: 200px;
                        margin-bottom: 30px;
                    }

                    .form-group {
                        margin-bottom: 20px;
                    }

                    label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                        font-size: 13px;
                    }

                    input[type="text"],
                    input[type="password"],
                    select {
                        width: 100%;
                        padding: 10px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        font-size: 13px;
                    }

                    input[type="text"]:focus,
                    input[type="password"]:focus,
                    select:focus {
                        outline: none;
                        border-color: #007ACC;
                        box-shadow: 0 0 0 1px #007ACC;
                    }

                    .button-group {
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    }

                    button {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        font-size: 13px;
                        cursor: pointer;
                        transition: background 0.2s;
                    }

                    .btn-primary {
                        background: #007ACC;
                        color: white;
                    }

                    .btn-primary:hover {
                        background: #005A9E;
                    }

                    .btn-secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }

                    .btn-secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }

                    .btn-primary:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .alert {
                        padding: 12px;
                        border-radius: 4px;
                        margin-bottom: 20px;
                        font-size: 13px;
                    }

                    .alert-error {
                        background: rgba(241, 76, 76, 0.2);
                        color: #F14C4C;
                        border: 1px solid #F14C4C;
                    }

                    .alert-success {
                        background: rgba(78, 201, 176, 0.2);
                        color: #4EC9B0;
                        border: 1px solid #4EC9B0;
                    }

                    .alert-info {
                        background: rgba(0, 122, 204, 0.2);
                        color: #007ACC;
                        border: 1px solid #007ACC;
                    }

                    .loading {
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        border: 2px solid #007ACC;
                        border-right-color: transparent;
                        border-radius: 50%;
                        animation: spin 0.6s linear infinite;
                        margin-right: 8px;
                    }

                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    .radio-group {
                        display: flex;
                        gap: 20px;
                        margin-bottom: 20px;
                    }

                    .radio-option {
                        flex: 1;
                        padding: 15px;
                        border: 2px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .radio-option:hover {
                        border-color: #007ACC;
                    }

                    .radio-option input[type="radio"] {
                        margin-right: 8px;
                    }

                    .radio-option.selected {
                        background: rgba(0, 122, 204, 0.1);
                        border-color: #007ACC;
                    }

                    .step-indicator {
                        font-size: 12px;
                        color: var(--vscode-editor-inactiveSelectionBackground);
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="wizard-container">
                        <div class="step-indicator" id="stepIndicator">Step 1 of 7</div>
                        <div class="progress-bar" id="progressBar"></div>

                        <h1 id="stepTitle">Welcome</h1>
                        <p class="description" id="stepDescription">Let's set up your AI test generator</p>

                        <div class="content" id="stepContent"></div>

                        <div id="alerts"></div>

                        <div class="button-group">
                            <button class="btn-secondary" id="backBtn" onclick="previousStep()">Back</button>
                            <button class="btn-primary" id="nextBtn" onclick="nextStep()">Next</button>
                        </div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let currentStep = 0;
                    const steps = ${JSON.stringify(SetupWizardProvider.STEPS)};

                    function initializeProgressBar() {
                        const progressBar = document.getElementById('progressBar');
                        steps.forEach((_, index) => {
                            const step = document.createElement('div');
                            step.className = 'step' + (index === 0 ? ' active' : '');
                            step.id = \`step-\${index}\`;
                            progressBar.appendChild(step);
                        });
                    }

                    function updateUI() {
                        const step = steps[currentStep];
                        document.getElementById('stepIndicator').textContent = \`Step \${currentStep + 1} of \${steps.length}\`;
                        document.getElementById('stepTitle').textContent = step.title;
                        document.getElementById('stepDescription').textContent = step.description;

                        document.getElementById('backBtn').style.display = currentStep === 0 ? 'none' : 'block';
                        document.getElementById('nextBtn').textContent = currentStep === steps.length - 1 ? 'Finish' : 'Next';

                        renderStepContent();
                        updateProgressBar();
                    }

                    function updateProgressBar() {
                        steps.forEach((_, index) => {
                            const stepEl = document.getElementById(\`step-\${index}\`);
                            stepEl.classList.remove('active', 'completed');
                            if (index < currentStep) {
                                stepEl.classList.add('completed');
                            } else if (index === currentStep) {
                                stepEl.classList.add('active');
                            }
                        });
                    }

                    function renderStepContent() {
                        const contentDiv = document.getElementById('stepContent');
                        const step = steps[currentStep];

                        switch (step.id) {
                            case 'welcome':
                                contentDiv.innerHTML = \`
                                    <div class="alert alert-info">
                                        <strong>Welcome!</strong> This wizard will help you set up the AI Unit Test Generator extension.
                                    </div>
                                    <p>We'll guide you through:</p>
                                    <ul style="margin-left: 20px; margin-top: 10px;">
                                        <li>Choosing your LLM provider (OpenAI or Ollama)</li>
                                        <li>Configuring your API credentials</li>
                                        <li>Setting up your Python environment</li>
                                        <li>Testing the connection</li>
                                    </ul>
                                \`;
                                break;

                            case 'provider-selection':
                                contentDiv.innerHTML = \`
                                    <div class="form-group">
                                        <label>Select your LLM provider:</label>
                                        <div class="radio-group">
                                            <div class="radio-option selected" onclick="selectProvider('openai', this)">
                                                <input type="radio" name="provider" value="openai" checked>
                                                <strong>OpenAI</strong>
                                                <div style="font-size: 12px; color: var(--vscode-editor-inactiveSelectionBackground); margin-top: 4px;">
                                                    Recommended. Uses GPT-4o
                                                </div>
                                            </div>
                                            <div class="radio-option" onclick="selectProvider('ollama', this)">
                                                <input type="radio" name="provider" value="ollama">
                                                <strong>Ollama</strong>
                                                <div style="font-size: 12px; color: var(--vscode-editor-inactiveSelectionBackground); margin-top: 4px;">
                                                    Local. Requires setup
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                \`;
                                break;

                            case 'api-key':
                                contentDiv.innerHTML = \`
                                    <div class="form-group">
                                        <label for="apiKey">OpenAI API Key:</label>
                                        <input type="password" id="apiKey" placeholder="sk-..." autocomplete="off">
                                        <div style="font-size: 12px; color: var(--vscode-editor-inactiveSelectionBackground); margin-top: 8px;">
                                            Get your API key from <a href="https://platform.openai.com/api-keys" style="color: #007ACC;">platform.openai.com</a>
                                        </div>
                                    </div>
                                \`;
                                break;

                            case 'python-check':
                                contentDiv.innerHTML = \`
                                    <div id="envCheckResult"></div>
                                \`;
                                checkEnvironment();
                                break;

                            case 'dependencies':
                                contentDiv.innerHTML = \`
                                    <div id="installResult"></div>
                                \`;
                                installDependencies();
                                break;

                            case 'test-connection':
                                contentDiv.innerHTML = \`
                                    <div id="connectionResult"></div>
                                \`;
                                testConnection();
                                break;

                            case 'complete':
                                contentDiv.innerHTML = \`
                                    <div class="alert alert-success">
                                        <strong>✓ Setup Complete!</strong> Your AI Unit Test Generator is ready to use.
                                    </div>
                                    <p>You can now:</p>
                                    <ul style="margin-left: 20px; margin-top: 10px;">
                                        <li>Extract functions from your Python files</li>
                                        <li>Generate test scenarios using AI</li>
                                        <li>Create pytest code automatically</li>
                                    </ul>
                                \`;
                                break;
                        }
                    }

                    function selectProvider(provider, element) {
                        document.querySelectorAll('.radio-option').forEach(el => el.classList.remove('selected'));
                        element.classList.add('selected');
                        element.querySelector('input[type="radio"]').checked = true;

                        vscode.postMessage({
                            type: 'select-provider',
                            provider: provider
                        });
                    }

                    function checkEnvironment() {
                        const result = document.getElementById('envCheckResult');
                        result.innerHTML = '<div class="loading"></div> Checking Python environment...';

                        vscode.postMessage({ type: 'check-environment' });
                    }

                    function installDependencies() {
                        const result = document.getElementById('installResult');
                        result.innerHTML = '<div class="loading"></div> Installing dependencies...';

                        vscode.postMessage({ type: 'install-dependencies' });
                    }

                    function testConnection() {
                        const result = document.getElementById('connectionResult');
                        result.innerHTML = '<div class="loading"></div> Testing connection...';

                        vscode.postMessage({ type: 'test-connection' });
                    }

                    function previousStep() {
                        if (currentStep > 0) {
                            currentStep--;
                            updateUI();
                        }
                    }

                    function nextStep() {
                        const step = steps[currentStep];
                        let selectedProvider = localStorage.getItem('selectedProvider') || 'openai';

                        if (step.id === 'provider-selection') {
                            const provider = document.querySelector('input[name="provider"]:checked').value;
                            localStorage.setItem('selectedProvider', provider);
                            selectedProvider = provider;

                            // Jump to api-key if openai, or python-check if ollama
                            if (provider === 'openai') {
                                currentStep++;
                            } else {
                                currentStep = steps.findIndex(s => s.id === 'python-check');
                            }
                        } else if (step.id === 'api-key') {
                            const apiKey = document.getElementById('apiKey').value;
                            if (!apiKey) {
                                showAlert('Please enter your API key', 'error');
                                return;
                            }
                            vscode.postMessage({
                                type: 'validate-api-key',
                                apiKey: apiKey
                            });
                            return;
                        } else if (step.id === 'complete') {
                            localStorage.removeItem('selectedProvider');
                            vscode.postMessage({ type: 'complete', success: true });
                            return;
                        } else {
                            currentStep++;
                        }

                        if (currentStep >= steps.length) {
                            currentStep = steps.length - 1;
                        }
                        updateUI();
                    }

                    function showAlert(message, type = 'info') {
                        const alertsDiv = document.getElementById('alerts');
                        const alert = document.createElement('div');
                        alert.className = \`alert alert-\${type}\`;
                        alert.textContent = message;
                        alertsDiv.innerHTML = '';
                        alertsDiv.appendChild(alert);
                    }

                    window.addEventListener('message', (event) => {
                        const message = event.data;

                        switch (message.type) {
                            case 'api-key-validated':
                                if (message.success) {
                                    showAlert(message.message, 'success');
                                    setTimeout(() => {
                                        currentStep++;
                                        updateUI();
                                    }, 1000);
                                } else {
                                    showAlert(message.error, 'error');
                                }
                                break;

                            case 'environment-checked':
                                if (message.success) {
                                    document.getElementById('envCheckResult').innerHTML = \`
                                        <div class="alert alert-success">
                                            <strong>✓ Environment OK</strong>
                                            <ul style="margin-left: 20px; margin-top: 8px; margin-bottom: 0;">
                                                <li>Python: \${message.environment.pythonVersion}</li>
                                                <li>Virtual Environment: \${message.environment.hasVenv ? 'Yes' : 'No'}</li>
                                                <li>Dependencies: \${message.environment.hasDependencies ? 'Installed' : 'Missing'}</li>
                                            </ul>
                                        </div>
                                    \`;
                                } else {
                                    document.getElementById('envCheckResult').innerHTML = \`
                                        <div class="alert alert-error">
                                            <strong>⚠ Environment Issue:</strong> \${message.error}
                                        </div>
                                    \`;
                                }
                                break;

                            case 'dependencies-installed':
                                if (message.success) {
                                    document.getElementById('installResult').innerHTML = \`
                                        <div class="alert alert-success">
                                            <strong>✓ Dependencies Installed</strong>
                                        </div>
                                    \`;
                                } else {
                                    document.getElementById('installResult').innerHTML = \`
                                        <div class="alert alert-error">
                                            <strong>✗ Installation Failed:</strong> \${message.error}
                                        </div>
                                    \`;
                                }
                                break;

                            case 'connection-tested':
                                if (message.success) {
                                    document.getElementById('connectionResult').innerHTML = \`
                                        <div class="alert alert-success">
                                            <strong>✓ Connection Successful</strong>
                                            <ul style="margin-left: 20px; margin-top: 8px; margin-bottom: 0;">
                                                <li>Provider: \${message.provider}</li>
                                                <li>Model: \${message.model}</li>
                                            </ul>
                                        </div>
                                    \`;
                                } else {
                                    document.getElementById('connectionResult').innerHTML = \`
                                        <div class="alert alert-error">
                                            <strong>✗ Connection Failed:</strong> \${message.error}
                                        </div>
                                    \`;
                                }
                                break;
                        }
                    });

                    initializeProgressBar();
                    updateUI();
                </script>
            </body>
            </html>
        `;
    }
}
