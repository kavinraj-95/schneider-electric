import * as vscode from 'vscode';

export interface ExtractedFunction {
    funcName: string;
    qualifiedName: string;
    className?: string;
    isAsync: boolean;
    funcSource: string;
    lineStart: number;
    lineEnd: number;
    filePath: string;
}

export interface FileItem {
    path: string;
    relativePath: string;
    selected: boolean;
}

export interface FunctionItem {
    function: ExtractedFunction;
    selected: boolean;
}

export interface Scenario {
    positive: string;
    negative: string;
}

export interface ScenariosResult {
    [qualifiedName: string]: Scenario;
}

export interface GeneratedTest {
    functionName: string;
    testContent: string;
    filePath: string;
}

export type PipelineState =
    | 'idle'
    | 'extracting'
    | 'selecting'
    | 'generating_scenarios'
    | 'generating_tests'
    | 'complete'
    | 'error';

export interface PipelineStatus {
    state: PipelineState;
    message: string;
    progress?: number;
    error?: string;
}

export interface PythonBridgeRequest {
    action: 'extract' | 'scenarios' | 'tests';
    data: unknown;
}

export interface PythonBridgeResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface OllamaHealthResponse {
    status: 'ok' | 'error';
    models?: string[];
    error?: string;
}

export interface ExtensionConfig {
    llmProvider: 'openai' | 'ollama';
    openaiApiKey: string;
    openaiModel: string;
    openaiOrganization: string;
    ollamaEndpoint: string;
    ollamaModel: string;
    testOutputDir: string;
    pythonPath: string;
}

export interface WebviewMessage {
    type: 'generate' | 'extract' | 'clear' | 'checkOllama' | 'getStatus' | 'runCoverage' | 'switchProvider' | 'switchModel';
    payload?: unknown;
}

export interface WebviewResponse {
    type: 'status' | 'progress' | 'error' | 'ollamaStatus' | 'complete';
    payload: unknown;
}

export interface FileTreeItem extends vscode.TreeItem {
    filePath: string;
    selected: boolean;
}

export interface FunctionTreeItem extends vscode.TreeItem {
    func: ExtractedFunction;
    selected: boolean;
}
