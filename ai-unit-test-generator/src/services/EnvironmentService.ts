import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from './ConfigService';
import { Logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

export interface EnvironmentCheckResult {
    isValid: boolean;
    pythonVersion: string;
    hasVenv: boolean;
    hasDependencies: boolean;
    issues: string[];
}

export class EnvironmentService {
    constructor(private configService: ConfigService) {}

    /**
     * Check Python environment
     */
    async checkEnvironment(): Promise<EnvironmentCheckResult> {
        const pythonPath = this.configService.getPythonPath();
        const issues: string[] = [];

        // Check Python version
        let pythonVersion = '';
        try {
            const { stdout } = await execFileAsync(pythonPath, ['--version']);
            pythonVersion = stdout.trim();

            // Check if version is 3.10+
            const versionMatch = pythonVersion.match(/(\d+)\.(\d+)/);
            if (versionMatch) {
                const major = parseInt(versionMatch[1]);
                const minor = parseInt(versionMatch[2]);

                if (major < 3 || (major === 3 && minor < 10)) {
                    issues.push(`Python 3.10+ required, found ${major}.${minor}`);
                }
            }
        } catch (error) {
            issues.push(`Python not found at ${pythonPath}`);
            Logger.error(`Python check failed: ${error}`);
            return {
                isValid: false,
                pythonVersion: 'Not found',
                hasVenv: false,
                hasDependencies: false,
                issues
            };
        }

        // Check for virtual environment
        const hasVenv = await this.checkVirtualEnvironment(pythonPath);
        if (!hasVenv) {
            issues.push('Virtual environment not detected');
        }

        // Check dependencies
        const hasDependencies = await this.checkDependencies(pythonPath);
        if (!hasDependencies) {
            issues.push('Some dependencies are missing');
        }

        return {
            isValid: issues.length === 0,
            pythonVersion,
            hasVenv,
            hasDependencies,
            issues
        };
    }

    /**
     * Check if virtual environment is being used
     */
    private async checkVirtualEnvironment(pythonPath: string): Promise<boolean> {
        try {
            const { stdout } = await execFileAsync(pythonPath, ['-c', 'import sys; print(hasattr(sys, "real_prefix") or (hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix))']);
            return stdout.trim() === 'True';
        } catch {
            return false;
        }
    }

    /**
     * Check if required dependencies are installed
     */
    private async checkDependencies(pythonPath: string): Promise<boolean> {
        const requiredPackages = [
            'langchain',
            'langgraph',
            'langsmith',
            'python-dotenv',
            'tenacity'
        ];

        // These can be hyphens or underscores
        const flexiblePackages = ['langchain-openai', 'langchain-ollama'];

        try {
            const { stdout } = await execFileAsync(pythonPath, ['-m', 'pip', 'list', '--format=json']);
            const installedPackages = JSON.parse(stdout);
            const installedNames = installedPackages.map((pkg: any) =>
                pkg.name.toLowerCase().replace(/_/g, '-')
            );

            // Check required packages
            for (const pkg of requiredPackages) {
                if (!installedNames.includes(pkg.toLowerCase().replace(/_/g, '-'))) {
                    return false;
                }
            }

            // Check if at least one flexible package is installed (OpenAI or Ollama)
            const hasFlexiblePackage = flexiblePackages.some((pkg) =>
                installedNames.includes(pkg.toLowerCase())
            );

            return hasFlexiblePackage;
        } catch (error) {
            Logger.error(`Dependency check failed: ${error}`);
            return false;
        }
    }

    /**
     * Install dependencies
     */
    async installDependencies(
        progressCallback?: (message: string, increment: number) => void
    ): Promise<void> {
        const pythonPath = this.configService.getPythonPath();
        const provider = this.configService.getLLMProvider();
        const progressUpdate = progressCallback || (() => {});

        try {
            progressUpdate('Installing required packages...', 20);

            // Try to upgrade pip first
            try {
                await execFileAsync(pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip']);
                progressUpdate('Pip upgraded', 30);
            } catch (error) {
                Logger.warn(`Failed to upgrade pip: ${error}`);
            }

            // Core dependencies needed by all providers
            const corePackages = [
                'langchain>=0.1.0',
                'langgraph>=0.0.40',
                'langsmith>=0.1.0',
                'python-dotenv>=1.0.0',
                'tenacity>=8.2.0'
            ];

            // Provider-specific packages
            const providerPackages = provider === 'openai'
                ? ['langchain-openai>=0.1.0']
                : ['langchain-ollama>=0.1.0'];

            const packages = [...corePackages, ...providerPackages];

            let installed = 0;

            for (const pkg of packages) {
                progressUpdate(`Installing ${pkg}...`, 30 + (installed * (70 / packages.length)));
                await execFileAsync(pythonPath, ['-m', 'pip', 'install', pkg]);
                installed++;
            }

            progressUpdate('Dependencies installed successfully', 100);
            Logger.log('All dependencies installed successfully');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Dependency installation failed: ${message}`);
            throw new Error(`Failed to install dependencies: ${message}`);
        }
    }

    /**
     * Install a single dependency
     */
    async installDependency(packageName: string): Promise<void> {
        const pythonPath = this.configService.getPythonPath();

        try {
            await execFileAsync(pythonPath, ['-m', 'pip', 'install', packageName]);
            Logger.log(`Package ${packageName} installed successfully`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Failed to install ${packageName}: ${message}`);
            throw new Error(`Failed to install ${packageName}: ${message}`);
        }
    }

    /**
     * Create or check virtual environment
     */
    async setupVirtualEnvironment(): Promise<void> {
        const pythonPath = this.configService.getPythonPath();

        try {
            const venvPath = path.join(process.cwd(), '.venv');

            // Check if venv already exists
            if (fs.existsSync(venvPath)) {
                Logger.log('Virtual environment already exists');
                return;
            }

            Logger.log('Creating virtual environment...');
            await execFileAsync(pythonPath, ['-m', 'venv', venvPath]);
            Logger.log('Virtual environment created successfully');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Virtual environment setup failed: ${message}`);
            throw new Error(`Failed to create virtual environment: ${message}`);
        }
    }
}
