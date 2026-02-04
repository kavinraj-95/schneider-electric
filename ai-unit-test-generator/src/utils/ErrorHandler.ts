import * as vscode from 'vscode';
import { Logger } from './logger';

export interface ErrorActionItem extends vscode.MessageItem {
    action?: () => Promise<void>;
}

export interface UserFriendlyError {
    title: string;
    message: string;
    actions?: ErrorActionItem[];
}

/**
 * Convert technical errors to user-friendly messages with actionable solutions
 */
export class ErrorHandler {
    /**
     * Handle and display errors to the user
     */
    static async handle(error: unknown, context?: string): Promise<void> {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error(`${context ? `${context}: ` : ''}${errorMessage}`);

        const userError = this.parseError(errorMessage);
        await this.showError(userError);
    }

    /**
     * Parse technical error into user-friendly format
     */
    private static parseError(errorMessage: string): UserFriendlyError {
        // OpenAI API Key errors
        if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('OpenAI API key')) {
            return {
                title: 'OpenAI API Key Not Configured',
                message: 'The OpenAI API key is not set. Please configure your API key.',
                actions: [
                    {
                        title: 'Get API Key',
                        action: async () => {
                            await vscode.env.openExternal(
                                vscode.Uri.parse('https://platform.openai.com/api-keys')
                            );
                        }
                    },
                    {
                        title: 'Configure in Settings',
                        action: async () => {
                            await vscode.commands.executeCommand(
                                'workbench.action.openSettings',
                                'aiUnitTesting.openaiApiKey'
                            );
                        }
                    }
                ]
            };
        }

        // Invalid API key
        if (errorMessage.includes('401') || errorMessage.includes('Invalid API key') || errorMessage.includes('Unauthorized')) {
            return {
                title: 'Invalid OpenAI API Key',
                message: 'The OpenAI API key is invalid or expired. Please check your configuration.',
                actions: [
                    {
                        title: 'Check API Key',
                        action: async () => {
                            await vscode.commands.executeCommand(
                                'workbench.action.openSettings',
                                'aiUnitTesting.openaiApiKey'
                            );
                        }
                    }
                ]
            };
        }

        // Rate limit errors
        if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('Too many requests')) {
            return {
                title: 'Rate Limit Exceeded',
                message: 'OpenAI API rate limit has been exceeded. Please wait a moment and try again.',
                actions: [
                    {
                        title: 'Retry',
                        action: async () => {
                            // User will retry manually
                        }
                    }
                ]
            };
        }

        // Python not found
        if (errorMessage.includes('Python not found') || errorMessage.includes('python') && errorMessage.includes('ENOENT')) {
            return {
                title: 'Python Not Found',
                message: 'Python is not installed or not in your PATH. Please install Python 3.10+ and configure the path.',
                actions: [
                    {
                        title: 'Install Python',
                        action: async () => {
                            await vscode.env.openExternal(
                                vscode.Uri.parse('https://www.python.org/downloads/')
                            );
                        }
                    },
                    {
                        title: 'Configure Python Path',
                        action: async () => {
                            await vscode.commands.executeCommand(
                                'workbench.action.openSettings',
                                'aiUnitTesting.pythonPath'
                            );
                        }
                    }
                ]
            };
        }

        // Python version errors
        if (errorMessage.includes('Python 3.10') || errorMessage.includes('version')) {
            return {
                title: 'Python Version Not Supported',
                message: 'Python 3.10 or higher is required. Please upgrade your Python installation.',
                actions: [
                    {
                        title: 'Download Python',
                        action: async () => {
                            await vscode.env.openExternal(
                                vscode.Uri.parse('https://www.python.org/downloads/')
                            );
                        }
                    }
                ]
            };
        }

        // Dependencies missing
        if (errorMessage.includes('dependencies') || errorMessage.includes('missing') || errorMessage.includes('No module')) {
            return {
                title: 'Missing Dependencies',
                message: 'Some required Python packages are not installed. Please install them.',
                actions: [
                    {
                        title: 'Install Dependencies',
                        action: async () => {
                            await vscode.commands.executeCommand('aiUnitTesting.showSetupWizard');
                        }
                    }
                ]
            };
        }

        // Ollama connection errors
        if (errorMessage.includes('Ollama') || errorMessage.includes('localhost:11434')) {
            return {
                title: 'Ollama Not Available',
                message: 'Could not connect to Ollama. Make sure Ollama is running and accessible.',
                actions: [
                    {
                        title: 'Install Ollama',
                        action: async () => {
                            await vscode.env.openExternal(
                                vscode.Uri.parse('https://ollama.ai/')
                            );
                        }
                    },
                    {
                        title: 'Configure Endpoint',
                        action: async () => {
                            await vscode.commands.executeCommand(
                                'workbench.action.openSettings',
                                'aiUnitTesting.ollamaEndpoint'
                            );
                        }
                    }
                ]
            };
        }

        // Network errors
        if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
            return {
                title: 'Connection Error',
                message: 'Unable to connect to the LLM provider. Please check your internet connection.',
                actions: [
                    {
                        title: 'Retry',
                        action: async () => {
                            // User will retry manually
                        }
                    }
                ]
            };
        }

        // Default error message
        return {
            title: 'Error',
            message: errorMessage || 'An unknown error occurred. Please try again.',
            actions: []
        };
    }

    /**
     * Display error message to user with action buttons
     */
    private static async showError(error: UserFriendlyError): Promise<void> {
        const actions = error.actions || [];
        const actionLabels = actions.map((a) => a.title);

        const selected = await vscode.window.showErrorMessage(
            error.message,
            ...actionLabels
        );

        if (selected) {
            const action = actions.find((a) => a.title === selected);
            if (action && action.action) {
                try {
                    await action.action();
                } catch (err) {
                    Logger.error(`Error executing action: ${err}`);
                }
            }
        }
    }

    /**
     * Show warning message
     */
    static async warn(message: string, ...actions: ErrorActionItem[]): Promise<void> {
        const actionLabels = actions.map((a) => a.title);
        const selected = await vscode.window.showWarningMessage(message, ...actionLabels);

        if (selected) {
            const action = actions.find((a) => a.title === selected);
            if (action && action.action) {
                try {
                    await action.action();
                } catch (err) {
                    Logger.error(`Error executing action: ${err}`);
                }
            }
        }
    }

    /**
     * Show info message
     */
    static async info(message: string, ...actions: ErrorActionItem[]): Promise<void> {
        const actionLabels = actions.map((a) => a.title);
        const selected = await vscode.window.showInformationMessage(message, ...actionLabels);

        if (selected) {
            const action = actions.find((a) => a.title === selected);
            if (action && action.action) {
                try {
                    await action.action();
                } catch (err) {
                    Logger.error(`Error executing action: ${err}`);
                }
            }
        }
    }
}
