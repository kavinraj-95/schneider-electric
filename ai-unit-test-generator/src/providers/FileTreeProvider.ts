import * as vscode from 'vscode';
import * as path from 'path';
import { FileItem } from '../types';

class FileTreeItem extends vscode.TreeItem {
    constructor(
        public readonly filePath: string,
        public readonly relativePath: string,
        public selected: boolean
    ) {
        super(relativePath, vscode.TreeItemCollapsibleState.None);

        this.tooltip = filePath;
        this.description = selected ? '$(check)' : '';
        this.contextValue = 'file';

        this.command = {
            command: 'aiUnitTesting.toggleFileSelection',
            title: 'Toggle Selection',
            arguments: [this]
        };

        this.iconPath = new vscode.ThemeIcon(
            selected ? 'file-code' : 'file',
            selected ? new vscode.ThemeColor('charts.green') : undefined
        );
    }
}

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<FileTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private files: Map<string, FileItem> = new Map();
    private filePattern: string = '**/*.py';

    getTreeItem(element: FileTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FileTreeItem): Promise<FileTreeItem[]> {
        if (element) {
            return [];
        }

        await this.scanWorkspace();

        const items: FileTreeItem[] = [];
        for (const [filePath, fileItem] of this.files) {
            items.push(new FileTreeItem(
                filePath,
                fileItem.relativePath,
                fileItem.selected
            ));
        }

        return items.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    }

    private async scanWorkspace(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const existingSelections = new Map<string, boolean>();
        for (const [path, item] of this.files) {
            existingSelections.set(path, item.selected);
        }

        this.files.clear();

        for (const folder of workspaceFolders) {
            const pattern = new vscode.RelativePattern(folder, this.filePattern);
            const excludePattern = '{**/node_modules/**,**/.venv/**,**/venv/**,**/__pycache__/**,**/tests/**}';

            const files = await vscode.workspace.findFiles(pattern, excludePattern);

            for (const file of files) {
                const relativePath = path.relative(folder.uri.fsPath, file.fsPath);
                const wasSelected = existingSelections.get(file.fsPath) || false;

                this.files.set(file.fsPath, {
                    path: file.fsPath,
                    relativePath,
                    selected: wasSelected
                });
            }
        }
    }

    toggleSelection(item: FileTreeItem): void {
        const fileItem = this.files.get(item.filePath);
        if (fileItem) {
            fileItem.selected = !fileItem.selected;
            this._onDidChangeTreeData.fire();
        }
    }

    selectAll(): void {
        for (const item of this.files.values()) {
            item.selected = true;
        }
        this._onDidChangeTreeData.fire();
    }

    clearSelection(): void {
        for (const item of this.files.values()) {
            item.selected = false;
        }
        this._onDidChangeTreeData.fire();
    }

    getSelectedFiles(): string[] {
        const selected: string[] = [];
        for (const [path, item] of this.files) {
            if (item.selected) {
                selected.push(path);
            }
        }
        return selected;
    }

    getSelectedCount(): number {
        return this.getSelectedFiles().length;
    }

    getTotalCount(): number {
        return this.files.size;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setFilePattern(pattern: string): void {
        this.filePattern = pattern;
        this.refresh();
    }
}
