import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { Logger } from '../utils/logger';

export interface CoverageData {
    typescript: {
        total: number;
        covered: number;
        percentage: number;
    } | null;
    python: {
        total: number;
        covered: number;
        percentage: number;
    } | null;
    overall: {
        total: number;
        covered: number;
        percentage: number;
    };
}

export class CoverageService {
    private extensionPath: string;
    private statusBarItem: vscode.StatusBarItem;
    private coverageData: CoverageData | null = null;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'aiUnitTesting.showCoverage';
        this.statusBarItem.tooltip = 'View code coverage details';
        this.updateStatusBar(null);
        this.statusBarItem.show();
    }

    async runCoverage(): Promise<CoverageData> {
        Logger.log('Running code coverage...');

        const tsCoverage = await this.runTypeScriptCoverage();
        const pyCoverage = await this.runPythonCoverage();

        let overall = { total: 0, covered: 0, percentage: 0 };

        if (tsCoverage && pyCoverage) {
            overall.total = tsCoverage.total + pyCoverage.total;
            overall.covered = tsCoverage.covered + pyCoverage.covered;
            overall.percentage = (overall.covered / overall.total) * 100;
        } else if (tsCoverage) {
            overall = { ...tsCoverage };
        } else if (pyCoverage) {
            overall = { ...pyCoverage };
        }

        this.coverageData = {
            typescript: tsCoverage,
            python: pyCoverage,
            overall
        };

        this.updateStatusBar(this.coverageData);
        return this.coverageData;
    }

    private async runTypeScriptCoverage(): Promise<{ total: number; covered: number; percentage: number } | null> {
        return new Promise((resolve) => {
            Logger.log('Running TypeScript coverage...');

            const process = spawn('npm', ['run', 'test:coverage', '--silent'], {
                cwd: this.extensionPath,
                shell: true
            });

            let output = '';

            process.stdout.on('data', (data: Buffer) => {
                output += data.toString();
            });

            process.stderr.on('data', (data: Buffer) => {
                output += data.toString();
            });

            process.on('close', (code: number | null) => {
                if (code !== 0) {
                    Logger.error(`TypeScript coverage failed with code ${code}`);
                    resolve(null);
                    return;
                }

                const coveragePath = path.join(this.extensionPath, 'coverage', 'coverage-summary.json');

                try {
                    if (fs.existsSync(coveragePath)) {
                        const coverageJson = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
                        const total = coverageJson.total;

                        if (total && total.lines) {
                            const result = {
                                total: total.lines.total,
                                covered: total.lines.covered,
                                percentage: total.lines.pct
                            };
                            Logger.log(`TypeScript coverage: ${result.percentage.toFixed(2)}%`);
                            resolve(result);
                        } else {
                            resolve(null);
                        }
                    } else {
                        Logger.error('TypeScript coverage file not found');
                        resolve(null);
                    }
                } catch (error) {
                    Logger.error(`Failed to parse TypeScript coverage: ${error}`);
                    resolve(null);
                }
            });
        });
    }

    private async runPythonCoverage(): Promise<{ total: number; covered: number; percentage: number } | null> {
        return new Promise((resolve) => {
            Logger.log('Running Python coverage...');

            const pythonDir = path.join(this.extensionPath, 'python');
            const process = spawn('uv', ['run', 'pytest', '--cov=.', '--cov-report=json', '--cov-report=term', '-q'], {
                cwd: pythonDir,
                shell: true
            });

            let output = '';

            process.stdout.on('data', (data: Buffer) => {
                output += data.toString();
            });

            process.stderr.on('data', (data: Buffer) => {
                output += data.toString();
            });

            process.on('close', (code: number | null) => {
                const coveragePath = path.join(pythonDir, 'coverage.json');

                try {
                    if (fs.existsSync(coveragePath)) {
                        const coverageJson = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
                        const totals = coverageJson.totals;

                        if (totals) {
                            const result = {
                                total: totals.num_statements,
                                covered: totals.covered_lines,
                                percentage: totals.percent_covered
                            };
                            Logger.log(`Python coverage: ${result.percentage.toFixed(2)}%`);
                            resolve(result);
                        } else {
                            resolve(null);
                        }
                    } else {
                        Logger.log('Python coverage file not found, skipping...');
                        resolve(null);
                    }
                } catch (error) {
                    Logger.log(`Python coverage not available: ${error}`);
                    resolve(null);
                }
            });

            process.on('error', () => {
                Logger.log('Python coverage not available');
                resolve(null);
            });
        });
    }

    private updateStatusBar(data: CoverageData | null): void {
        if (!data) {
            this.statusBarItem.text = '$(pulse) Coverage: Not Run';
            this.statusBarItem.backgroundColor = undefined;
        } else {
            const pct = data.overall.percentage;
            const icon = this.getCoverageIcon(pct);
            const color = this.getCoverageColor(pct);

            this.statusBarItem.text = `${icon} Coverage: ${pct.toFixed(1)}%`;
            this.statusBarItem.backgroundColor = color;
        }
    }

    private getCoverageIcon(percentage: number): string {
        if (percentage >= 80) {
            return '$(check)';
        } else if (percentage >= 60) {
            return '$(warning)';
        } else {
            return '$(error)';
        }
    }

    private getCoverageColor(percentage: number): vscode.ThemeColor | undefined {
        if (percentage < 50) {
            return new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (percentage < 70) {
            return new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        return undefined;
    }

    getCoverageData(): CoverageData | null {
        return this.coverageData;
    }

    showCoverageReport(): void {
        if (!this.coverageData) {
            vscode.window.showInformationMessage('No coverage data available. Run coverage first.');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'coverageReport',
            'Code Coverage Report',
            vscode.ViewColumn.One,
            { enableScripts: false }
        );

        panel.webview.html = this.getCoverageHtml(this.coverageData);
    }

    private getCoverageHtml(data: CoverageData): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Coverage Report</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1 {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .coverage-section {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
            border-radius: 5px;
        }
        .coverage-bar {
            height: 30px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 5px;
            overflow: hidden;
            margin: 10px 0;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #f44336, #ff9800, #4caf50);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 10px;
        }
        .metric {
            text-align: center;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-radius: 3px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-charts-blue);
        }
        .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
        }
        .badge-success { background-color: #4caf50; color: white; }
        .badge-warning { background-color: #ff9800; color: white; }
        .badge-error { background-color: #f44336; color: white; }
    </style>
</head>
<body>
    <h1>Code Coverage Report</h1>

    <div class="coverage-section">
        <h2>Overall Coverage ${this.getCoverageBadge(data.overall.percentage)}</h2>
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${data.overall.percentage}%">
                ${data.overall.percentage.toFixed(2)}%
            </div>
        </div>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${data.overall.total}</div>
                <div class="metric-label">Total Lines</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.overall.covered}</div>
                <div class="metric-label">Covered Lines</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.overall.total - data.overall.covered}</div>
                <div class="metric-label">Uncovered Lines</div>
            </div>
        </div>
    </div>

    ${data.typescript ? `
    <div class="coverage-section">
        <h2>TypeScript Coverage ${this.getCoverageBadge(data.typescript.percentage)}</h2>
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${data.typescript.percentage}%">
                ${data.typescript.percentage.toFixed(2)}%
            </div>
        </div>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${data.typescript.total}</div>
                <div class="metric-label">Total Lines</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.typescript.covered}</div>
                <div class="metric-label">Covered Lines</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.typescript.total - data.typescript.covered}</div>
                <div class="metric-label">Uncovered Lines</div>
            </div>
        </div>
    </div>
    ` : '<p>TypeScript coverage not available</p>'}

    ${data.python ? `
    <div class="coverage-section">
        <h2>Python Coverage ${this.getCoverageBadge(data.python.percentage)}</h2>
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${data.python.percentage}%">
                ${data.python.percentage.toFixed(2)}%
            </div>
        </div>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${data.python.total}</div>
                <div class="metric-label">Total Statements</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.python.covered}</div>
                <div class="metric-label">Covered Statements</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.python.total - data.python.covered}</div>
                <div class="metric-label">Uncovered Statements</div>
            </div>
        </div>
    </div>
    ` : '<p>Python coverage not available</p>'}
</body>
</html>`;
    }

    private getCoverageBadge(percentage: number): string {
        if (percentage >= 80) {
            return '<span class="badge badge-success">Excellent</span>';
        } else if (percentage >= 60) {
            return '<span class="badge badge-warning">Good</span>';
        } else {
            return '<span class="badge badge-error">Needs Improvement</span>';
        }
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
