import * as vscode from 'vscode';
import * as path from 'path';
import { ExtractedFunction, FunctionItem } from '../types';

type FunctionTreeElement = FileGroupItem | FunctionTreeItem;

class FileGroupItem extends vscode.TreeItem {
    constructor(
        public readonly filePath: string,
        public readonly fileName: string,
        public readonly functions: FunctionTreeItem[]
    ) {
        super(fileName, vscode.TreeItemCollapsibleState.Expanded);

        this.tooltip = filePath;
        this.contextValue = 'fileGroup';
        this.iconPath = new vscode.ThemeIcon('file-code');

        const selectedCount = functions.filter(f => f.selected).length;
        this.description = `${selectedCount}/${functions.length} selected`;
    }
}

class FunctionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly func: ExtractedFunction,
        public selected: boolean
    ) {
        super(func.funcName, vscode.TreeItemCollapsibleState.None);

        const badges: string[] = [];
        if (func.isAsync) {
            badges.push('async');
        }
        if (func.className) {
            badges.push(`@${func.className}`);
        }

        this.description = badges.length > 0 ? badges.join(' ') : '';
        this.tooltip = new vscode.MarkdownString();
        this.tooltip.appendCodeblock(func.funcSource.substring(0, 200) + '...', 'python');

        this.contextValue = 'function';

        this.command = {
            command: 'aiUnitTesting.toggleFunctionSelection',
            title: 'Toggle Selection',
            arguments: [this]
        };

        this.iconPath = new vscode.ThemeIcon(
            selected ? 'symbol-method' : 'symbol-function',
            selected ? new vscode.ThemeColor('charts.green') : undefined
        );
    }
}

export class FunctionTreeProvider implements vscode.TreeDataProvider<FunctionTreeElement> {
    private _onDidChangeTreeData = new vscode.EventEmitter<FunctionTreeElement | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private functions: Map<string, FunctionItem> = new Map();
    private fileGroups: Map<string, FunctionTreeItem[]> = new Map();

    getTreeItem(element: FunctionTreeElement): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FunctionTreeElement): FunctionTreeElement[] {
        if (!element) {
            const groups: FileGroupItem[] = [];
            for (const [filePath, functions] of this.fileGroups) {
                const fileName = path.basename(filePath);
                groups.push(new FileGroupItem(filePath, fileName, functions));
            }
            return groups.sort((a, b) => a.fileName.localeCompare(b.fileName));
        }

        if (element instanceof FileGroupItem) {
            return element.functions;
        }

        return [];
    }

    setFunctions(functions: ExtractedFunction[]): void {
        this.functions.clear();
        this.fileGroups.clear();

        for (const func of functions) {
            const key = func.qualifiedName + '@' + func.filePath;
            this.functions.set(key, {
                function: func,
                selected: true
            });
        }

        this.rebuildFileGroups();
        this._onDidChangeTreeData.fire();
    }

    private rebuildFileGroups(): void {
        this.fileGroups.clear();

        for (const [key, item] of this.functions) {
            const filePath = item.function.filePath;

            if (!this.fileGroups.has(filePath)) {
                this.fileGroups.set(filePath, []);
            }

            this.fileGroups.get(filePath)!.push(
                new FunctionTreeItem(item.function, item.selected)
            );
        }

        for (const functions of this.fileGroups.values()) {
            functions.sort((a, b) => a.func.lineStart - b.func.lineStart);
        }
    }

    toggleSelection(item: FunctionTreeItem): void {
        const key = item.func.qualifiedName + '@' + item.func.filePath;
        const funcItem = this.functions.get(key);

        if (funcItem) {
            funcItem.selected = !funcItem.selected;
            this.rebuildFileGroups();
            this._onDidChangeTreeData.fire();
        }
    }

    selectAll(): void {
        for (const item of this.functions.values()) {
            item.selected = true;
        }
        this.rebuildFileGroups();
        this._onDidChangeTreeData.fire();
    }

    clearSelection(): void {
        for (const item of this.functions.values()) {
            item.selected = false;
        }
        this.rebuildFileGroups();
        this._onDidChangeTreeData.fire();
    }

    clearFunctions(): void {
        this.functions.clear();
        this.fileGroups.clear();
        this._onDidChangeTreeData.fire();
    }

    getSelectedFunctions(): ExtractedFunction[] {
        const selected: ExtractedFunction[] = [];
        for (const item of this.functions.values()) {
            if (item.selected) {
                selected.push(item.function);
            }
        }
        return selected;
    }

    getSelectedCount(): number {
        return this.getSelectedFunctions().length;
    }

    getTotalCount(): number {
        return this.functions.size;
    }

    refresh(): void {
        this.rebuildFileGroups();
        this._onDidChangeTreeData.fire();
    }
}
