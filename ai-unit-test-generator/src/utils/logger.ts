import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    static init(channel: vscode.OutputChannel): void {
        this.outputChannel = channel;
    }

    static log(message: string): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${message}`;
        this.outputChannel?.appendLine(formattedMessage);
        console.log(formattedMessage);
    }

    static error(message: string): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ERROR: ${message}`;
        this.outputChannel?.appendLine(formattedMessage);
        console.error(formattedMessage);
    }

    static warn(message: string): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] WARN: ${message}`;
        this.outputChannel?.appendLine(formattedMessage);
        console.warn(formattedMessage);
    }

    static show(): void {
        this.outputChannel?.show();
    }
}
