import * as vscode from 'vscode';
import { SidebarProvider } from './providers/SidebarProvider';
import { FileTreeProvider } from './providers/FileTreeProvider';
import { FunctionTreeProvider } from './providers/FunctionTreeProvider';
import { Pipeline } from './pipeline/Pipeline';
import { PythonBridge } from './services/PythonBridge';
import { OllamaService } from './services/OllamaService';
import { ConfigService } from './services/ConfigService';
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
    context.subscriptions.push(statusBarItem);

    const configService = new ConfigService();
    const pythonBridge = new PythonBridge(context.extensionPath, configService);
    const ollamaService = new OllamaService(configService);
    const pipeline = new Pipeline(pythonBridge, ollamaService, configService);

    const fileTreeProvider = new FileTreeProvider();
    const functionTreeProvider = new FunctionTreeProvider();
    const sidebarProvider = new SidebarProvider(
        context.extensionUri,
        pipeline,
        ollamaService,
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
