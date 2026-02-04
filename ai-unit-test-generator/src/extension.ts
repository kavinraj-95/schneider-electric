import * as vscode from 'vscode';
import { SidebarProvider } from './providers/SidebarProvider';
import { SetupWizardProvider } from './providers/SetupWizardProvider';
import { HelpProvider } from './providers/HelpProvider';
import { FileTreeProvider } from './providers/FileTreeProvider';
import { FunctionTreeProvider } from './providers/FunctionTreeProvider';
import { Pipeline } from './pipeline/Pipeline';
import { PythonBridge } from './services/PythonBridge';
import { LLMService } from './services/LLMService';
import { ConfigService } from './services/ConfigService';
import { EnvironmentService } from './services/EnvironmentService';
import { CoverageService } from './services/CoverageService';
import { Logger } from './utils/logger';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('AI Unit Testing');
    Logger.init(outputChannel);
    Logger.log('AI Unit Test Generator extension activated');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(beaker) AI Tests';
    statusBarItem.tooltip = 'AI Unit Test Generator';
    statusBarItem.command = 'aiUnitTesting.showSidebar';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const configService = new ConfigService();
    const pythonBridge = new PythonBridge(context.extensionPath, configService);
    const llmService = new LLMService(configService);
    const environmentService = new EnvironmentService(configService);
    const pipeline = new Pipeline(pythonBridge, llmService, configService);
    const coverageService = new CoverageService(context.extensionPath);

    const fileTreeProvider = new FileTreeProvider();
    const functionTreeProvider = new FunctionTreeProvider();
    const sidebarProvider = new SidebarProvider(
        context.extensionUri,
        pipeline,
        llmService,
        configService,
        fileTreeProvider,
        functionTreeProvider
    );

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('aiUnitTesting.files', fileTreeProvider)
    );

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('aiUnitTesting.functions', functionTreeProvider)
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aiUnitTesting.sidebar', sidebarProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.extractFunctions', async () => {
            const selectedFiles = fileTreeProvider.getSelectedFiles();
            if (selectedFiles.length === 0) {
                vscode.window.showWarningMessage('No files selected. Please select files first.');
                return;
            }

            Logger.log(`Extracting functions from ${selectedFiles.length} files`);
            statusBarItem.text = '$(sync~spin) Extracting...';
            statusBarItem.show();

            try {
                const functions = await pipeline.extractFunctions(selectedFiles);
                functionTreeProvider.setFunctions(functions);
                Logger.log(`Extracted ${functions.length} functions`);
                vscode.window.showInformationMessage(`Extracted ${functions.length} functions`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                Logger.error(`Extraction failed: ${message}`);
                vscode.window.showErrorMessage(`Extraction failed: ${message}`);
            } finally {
                statusBarItem.text = '$(beaker) AI Tests';
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.generateTests', async () => {
            const selectedFunctions = functionTreeProvider.getSelectedFunctions();
            if (selectedFunctions.length === 0) {
                vscode.window.showWarningMessage('No functions selected. Please select functions first.');
                return;
            }

            Logger.log(`Generating tests for ${selectedFunctions.length} functions`);
            statusBarItem.text = '$(sync~spin) Generating...';
            statusBarItem.show();

            try {
                const tests = await pipeline.generateTests(selectedFunctions);
                Logger.log(`Generated ${tests.length} test files`);
                vscode.window.showInformationMessage(`Generated ${tests.length} test files`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                Logger.error(`Test generation failed: ${message}`);
                vscode.window.showErrorMessage(`Test generation failed: ${message}`);
            } finally {
                statusBarItem.text = '$(beaker) AI Tests';
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.clearSelection', () => {
            fileTreeProvider.clearSelection();
            functionTreeProvider.clearFunctions();
            Logger.log('Selection cleared');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.refreshFiles', () => {
            fileTreeProvider.refresh();
            Logger.log('Files refreshed');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.toggleFileSelection', (item) => {
            fileTreeProvider.toggleSelection(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.toggleFunctionSelection', (item) => {
            functionTreeProvider.toggleSelection(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.showSidebar', () => {
            vscode.commands.executeCommand('workbench.view.extension.aiUnitTesting');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.runCoverage', async () => {
            Logger.log('Running code coverage...');
            statusBarItem.text = '$(sync~spin) Running Coverage...';
            statusBarItem.show();

            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Running code coverage',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0, message: 'Running TypeScript tests...' });
                    await coverageService.runCoverage();
                    progress.report({ increment: 100, message: 'Complete!' });
                });

                vscode.window.showInformationMessage('Code coverage completed!');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                Logger.error(`Coverage failed: ${message}`);
                vscode.window.showErrorMessage(`Coverage failed: ${message}`);
            } finally {
                statusBarItem.text = '$(beaker) AI Tests';
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.showCoverage', () => {
            coverageService.showCoverageReport();
        })
    );

    context.subscriptions.push(coverageService);

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.showSetupWizard', async () => {
            Logger.log('Opening setup wizard');
            const wizard = new SetupWizardProvider(
                context,
                configService,
                llmService,
                environmentService
            );
            await wizard.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiUnitTesting.showHelp', async () => {
            Logger.log('Opening help documentation');
            await HelpProvider.show();
        })
    );

    // Show setup wizard on first run
    const isFirstRun = !context.globalState.get('setupWizardCompleted', false);
    if (isFirstRun) {
        // Show welcome message with options
        vscode.window.showInformationMessage(
            '👋 Welcome to AI Unit Test Generator!',
            'Setup Now',
            'Configure Later'
        ).then((choice) => {
            if (choice === 'Setup Now') {
                vscode.commands.executeCommand('aiUnitTesting.showSetupWizard');
            }
        });

        // Also try to auto-show wizard after a delay as backup
        setTimeout(async () => {
            try {
                const wizard = new SetupWizardProvider(
                    context,
                    configService,
                    llmService,
                    environmentService
                );
                await wizard.show();
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                Logger.error(`Setup wizard error: ${message}`);
                vscode.window.showErrorMessage(`Setup wizard error: ${message}`);
            }
        }, 500);
    }

    pipeline.on('stateChange', (status) => {
        sidebarProvider.updateStatus(status);
        if (status.state === 'error') {
            statusBarItem.text = '$(error) AI Tests';
        } else if (status.state === 'complete') {
            statusBarItem.text = '$(check) AI Tests';
            setTimeout(() => {
                statusBarItem.text = '$(beaker) AI Tests';
            }, 3000);
        }
    });

    fileTreeProvider.refresh();
    statusBarItem.show();

    Logger.log('Extension initialization complete');
}

export function deactivate() {
    Logger.log('AI Unit Test Generator extension deactivated');
}
