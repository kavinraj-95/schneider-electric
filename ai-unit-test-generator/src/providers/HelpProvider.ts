import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * Help provider that shows in-extension documentation and guides
 */
export class HelpProvider {
    /**
     * Show help documentation
     */
    static async show(): Promise<void> {
        Logger.log('Opening Help');

        const panel = vscode.window.createWebviewPanel(
            'aiUnitTestingHelp',
            'AI Unit Testing Help',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getHelpHtml();
    }

    /**
     * Generate help HTML content
     */
    private static getHelpHtml(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Unit Testing Help</title>
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
                        line-height: 1.6;
                    }

                    .container {
                        max-width: 900px;
                        margin: 0 auto;
                    }

                    h1 {
                        font-size: 28px;
                        margin-bottom: 30px;
                        color: var(--vscode-editor-foreground);
                        border-bottom: 2px solid #007ACC;
                        padding-bottom: 15px;
                    }

                    h2 {
                        font-size: 20px;
                        margin-top: 30px;
                        margin-bottom: 15px;
                        color: #007ACC;
                    }

                    h3 {
                        font-size: 16px;
                        margin-top: 20px;
                        margin-bottom: 10px;
                        color: var(--vscode-editor-foreground);
                    }

                    p {
                        margin-bottom: 12px;
                        color: var(--vscode-editor-foreground);
                    }

                    ul, ol {
                        margin-left: 20px;
                        margin-bottom: 12px;
                    }

                    li {
                        margin-bottom: 8px;
                    }

                    code {
                        background: var(--vscode-textCodeBlock-background);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                        font-size: 13px;
                    }

                    pre {
                        background: var(--vscode-textCodeBlock-background);
                        padding: 12px;
                        border-radius: 4px;
                        overflow-x: auto;
                        margin-bottom: 12px;
                        font-size: 12px;
                        line-height: 1.4;
                    }

                    .info-box {
                        background: rgba(0, 122, 204, 0.1);
                        border-left: 4px solid #007ACC;
                        padding: 12px;
                        margin-bottom: 20px;
                        border-radius: 4px;
                    }

                    .warning-box {
                        background: rgba(241, 76, 76, 0.1);
                        border-left: 4px solid #F14C4C;
                        padding: 12px;
                        margin-bottom: 20px;
                        border-radius: 4px;
                    }

                    .success-box {
                        background: rgba(78, 201, 176, 0.1);
                        border-left: 4px solid #4EC9B0;
                        padding: 12px;
                        margin-bottom: 20px;
                        border-radius: 4px;
                    }

                    a {
                        color: #007ACC;
                        text-decoration: none;
                    }

                    a:hover {
                        text-decoration: underline;
                    }

                    .section {
                        margin-bottom: 40px;
                    }

                    .faq-item {
                        margin-bottom: 20px;
                        padding: 12px;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                    }

                    .faq-question {
                        font-weight: bold;
                        margin-bottom: 8px;
                        cursor: pointer;
                        user-select: none;
                    }

                    .faq-answer {
                        display: none;
                        padding-top: 8px;
                        border-top: 1px solid var(--vscode-panel-border);
                    }

                    .faq-answer.open {
                        display: block;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🧪 AI Unit Testing Help</h1>

                    <div class="section">
                        <h2>Getting Started</h2>
                        <p>Welcome to AI Unit Test Generator! This extension automatically generates test scenarios and pytest code using AI.</p>

                        <h3>Quick Start</h3>
                        <ol>
                            <li>Run the Setup Wizard from the command palette</li>
                            <li>Configure your LLM provider (OpenAI recommended)</li>
                            <li>Select Python files to extract functions from</li>
                            <li>Select functions to generate tests for</li>
                            <li>Review the generated test scenarios</li>
                            <li>Generate the test files</li>
                        </ol>

                        <div class="success-box">
                            <strong>Tip:</strong> If you haven't run the setup wizard yet, open the Command Palette (Cmd/Ctrl+Shift+P) and search for "Setup Wizard".
                        </div>
                    </div>

                    <div class="section">
                        <h2>LLM Provider Configuration</h2>

                        <h3>OpenAI (Recommended)</h3>
                        <p>Uses GPT-4o for better code understanding and test quality.</p>
                        <ol>
                            <li>Get an API key from <a href="https://platform.openai.com/api-keys">platform.openai.com</a></li>
                            <li>Set the <code>OPENAI_API_KEY</code> environment variable or configure it in VS Code settings</li>
                            <li>Choose your model (default: gpt-4o)</li>
                        </ol>

                        <h3>Ollama (Local)</h3>
                        <p>Runs models locally without API costs, but requires more setup.</p>
                        <ol>
                            <li>Install <a href="https://ollama.ai/">Ollama</a></li>
                            <li>Pull a model: <code>ollama pull llama3.2</code></li>
                            <li>Ensure Ollama is running on <code>http://localhost:11434</code></li>
                            <li>Configure the Ollama endpoint in settings if needed</li>
                        </ol>

                        <div class="info-box">
                            <strong>Environment Variables:</strong> You can also configure your LLM provider using environment variables:
                            <pre>OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
AI_PROVIDER=openai</pre>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Understanding Test Generation</h2>

                        <h3>Test Scenarios</h3>
                        <p>The extension generates two types of test scenarios:</p>
                        <ul>
                            <li><strong>Positive Scenarios:</strong> Test cases where the function works with valid inputs</li>
                            <li><strong>Negative Scenarios:</strong> Test cases that check error handling and edge cases</li>
                        </ul>

                        <h3>Test Generation Process</h3>
                        <ol>
                            <li><strong>Extract Functions:</strong> Analyzes your Python files and extracts function definitions</li>
                            <li><strong>Generate Scenarios:</strong> Uses AI to create test scenarios for each function</li>
                            <li><strong>Preview Scenarios:</strong> Review the generated scenarios before creating tests</li>
                            <li><strong>Generate Tests:</strong> Converts scenarios to pytest code</li>
                            <li><strong>Save Tests:</strong> Saves test files to your tests directory</li>
                        </ol>
                    </div>

                    <div class="section">
                        <h2>Cost Tracking</h2>
                        <p>When using OpenAI, the extension tracks your API costs.</p>
                        <ul>
                            <li><strong>Estimated Cost:</strong> Before generating tests, you'll see an estimated cost</li>
                            <li><strong>Cost Summary:</strong> Monitor your monthly spending in the status bar</li>
                            <li><strong>Monthly Budget:</strong> Set a monthly budget to prevent overspending</li>
                        </ul>

                        <div class="info-box">
                            <strong>Cost Estimates:</strong>
                            <ul>
                                <li>GPT-4o: $0.005 per 1K input tokens, $0.015 per 1K output tokens</li>
                                <li>GPT-4-turbo: $0.01 per 1K input tokens, $0.03 per 1K output tokens</li>
                                <li>GPT-3.5-turbo: $0.0005 per 1K input tokens, $0.0015 per 1K output tokens</li>
                            </ul>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Troubleshooting</h2>

                        <h3>Common Issues</h3>

                        <div class="faq-item">
                            <div class="faq-question" onclick="toggleFAQ(this)">❓ Python not found</div>
                            <div class="faq-answer">
                                <p>Make sure Python 3.10+ is installed and either:</p>
                                <ul>
                                    <li>In your PATH</li>
                                    <li>Or configure the path in VS Code settings: <code>aiUnitTesting.pythonPath</code></li>
                                </ul>
                            </div>
                        </div>

                        <div class="faq-item">
                            <div class="faq-question" onclick="toggleFAQ(this)">❓ "Invalid API key" error</div>
                            <div class="faq-answer">
                                <p>Your OpenAI API key may be invalid, expired, or have insufficient permissions.</p>
                                <ul>
                                    <li>Visit <a href="https://platform.openai.com/api-keys">platform.openai.com/api-keys</a></li>
                                    <li>Generate a new API key</li>
                                    <li>Update your configuration</li>
                                </ul>
                            </div>
                        </div>

                        <div class="faq-item">
                            <div class="faq-question" onclick="toggleFAQ(this)">❓ "Ollama is not available"</div>
                            <div class="faq-answer">
                                <p>Make sure Ollama is running locally:</p>
                                <ol>
                                    <li>Install Ollama from <a href="https://ollama.ai/">ollama.ai</a></li>
                                    <li>Start Ollama: <code>ollama serve</code></li>
                                    <li>Check the endpoint in settings</li>
                                </ol>
                            </div>
                        </div>

                        <div class="faq-item">
                            <div class="faq-question" onclick="toggleFAQ(this)">❓ Dependencies installation fails</div>
                            <div class="faq-answer">
                                <p>Try manually installing dependencies:</p>
                                <pre>pip install langchain langchain-openai langchain-ollama langgraph langsmith python-dotenv tenacity pytest pytest-cov</pre>
                                <p>Or run the Setup Wizard again.</p>
                            </div>
                        </div>

                        <div class="faq-item">
                            <div class="faq-question" onclick="toggleFAQ(this)">❓ Generated tests are low quality</div>
                            <div class="faq-answer">
                                <p>Test quality depends on your code documentation. Consider:</p>
                                <ul>
                                    <li>Adding docstrings to your functions</li>
                                    <li>Using clear function and variable names</li>
                                    <li>Trying a more powerful model (e.g., GPT-4o instead of GPT-3.5-turbo)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Best Practices</h2>
                        <ul>
                            <li><strong>Write clear docstrings:</strong> Better documentation = better tests</li>
                            <li><strong>Use type hints:</strong> They help the AI understand your code</li>
                            <li><strong>Review generated tests:</strong> Always review and adjust generated tests</li>
                            <li><strong>Use positive + negative scenarios:</strong> This ensures comprehensive test coverage</li>
                            <li><strong>Monitor costs:</strong> Keep track of your API usage when using OpenAI</li>
                        </ul>
                    </div>

                    <div class="section">
                        <h2>Keyboard Shortcuts</h2>
                        <ul>
                            <li><strong>Cmd/Ctrl+Shift+P:</strong> Open Command Palette</li>
                            <li>Search for "Setup Wizard" to configure the extension</li>
                            <li>Search for "Extract Functions" to extract functions from selected files</li>
                            <li>Search for "Generate Tests" to generate test files</li>
                        </ul>
                    </div>

                    <div class="section">
                        <h2>Settings</h2>
                        <p>Configure the extension in VS Code Settings:</p>
                        <ul>
                            <li><code>aiUnitTesting.llmProvider</code> - Choose OpenAI or Ollama</li>
                            <li><code>aiUnitTesting.openaiApiKey</code> - Your OpenAI API key</li>
                            <li><code>aiUnitTesting.openaiModel</code> - Model selection (gpt-4o, gpt-4-turbo, gpt-3.5-turbo)</li>
                            <li><code>aiUnitTesting.ollamaEndpoint</code> - Ollama server URL</li>
                            <li><code>aiUnitTesting.ollamaModel</code> - Ollama model name</li>
                            <li><code>aiUnitTesting.testOutputDir</code> - Where to save generated tests</li>
                            <li><code>aiUnitTesting.pythonPath</code> - Path to Python interpreter</li>
                        </ul>
                    </div>
                </div>

                <script>
                    function toggleFAQ(element) {
                        const answer = element.nextElementSibling;
                        answer.classList.toggle('open');
                    }
                </script>
            </body>
            </html>
        `;
    }
}
