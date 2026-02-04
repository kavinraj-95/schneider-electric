import { ConfigService } from './ConfigService';
import { LLMService } from './LLMService';
import { EnvironmentService } from './EnvironmentService';
import { Logger } from '../utils/logger';

export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
}

export interface ValidationIssue {
    severity: 'error' | 'warning';
    component: string;
    message: string;
    suggestion?: string;
}

/**
 * Comprehensive validation service for checking configuration and environment
 */
export class ValidationService {
    constructor(
        private configService: ConfigService,
        private llmService: LLMService,
        private environmentService: EnvironmentService
    ) {}

    /**
     * Run full validation
     */
    async validateAll(): Promise<ValidationResult> {
        const issues: ValidationIssue[] = [];

        // Validate LLM provider configuration
        issues.push(...await this.validateLLMConfiguration());

        // Validate Python environment
        issues.push(...await this.validatePythonEnvironment());

        // Validate connectivity
        issues.push(...await this.validateConnectivity());

        const isValid = issues.filter((i) => i.severity === 'error').length === 0;

        return {
            isValid,
            issues
        };
    }

    /**
     * Validate LLM provider configuration
     */
    private async validateLLMConfiguration(): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];
        const provider = this.configService.getLLMProvider();

        if (provider === 'openai') {
            const apiKey = this.configService.getOpenAIApiKey();

            if (!apiKey) {
                issues.push({
                    severity: 'error',
                    component: 'OpenAI Configuration',
                    message: 'OpenAI API key is not configured',
                    suggestion: 'Set OPENAI_API_KEY environment variable or configure it in settings'
                });
            } else if (!apiKey.startsWith('sk-')) {
                issues.push({
                    severity: 'error',
                    component: 'OpenAI Configuration',
                    message: 'OpenAI API key format appears invalid',
                    suggestion: 'API keys should start with "sk-"'
                });
            }

            const model = this.configService.getOpenAIModel();
            const validModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
            if (!validModels.includes(model)) {
                issues.push({
                    severity: 'warning',
                    component: 'OpenAI Configuration',
                    message: `Model "${model}" may not be available`,
                    suggestion: `Use one of: ${validModels.join(', ')}`
                });
            }
        } else if (provider === 'ollama') {
            const endpoint = this.configService.getOllamaEndpoint();

            if (!endpoint) {
                issues.push({
                    severity: 'error',
                    component: 'Ollama Configuration',
                    message: 'Ollama endpoint is not configured',
                    suggestion: 'Configure the Ollama endpoint in settings'
                });
            }
        } else {
            issues.push({
                severity: 'error',
                component: 'LLM Provider',
                message: 'Invalid LLM provider',
                suggestion: 'Choose either "openai" or "ollama"'
            });
        }

        return issues;
    }

    /**
     * Validate Python environment
     */
    private async validatePythonEnvironment(): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];

        try {
            const envCheck = await this.environmentService.checkEnvironment();

            if (!envCheck.isValid) {
                for (const issue of envCheck.issues) {
                    issues.push({
                        severity: 'error',
                        component: 'Python Environment',
                        message: issue
                    });
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            issues.push({
                severity: 'error',
                component: 'Python Environment',
                message: `Failed to check Python environment: ${message}`,
                suggestion: 'Ensure Python 3.10+ is installed and accessible'
            });
        }

        return issues;
    }

    /**
     * Validate LLM provider connectivity
     */
    private async validateConnectivity(): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];

        try {
            const health = await this.llmService.checkHealth();

            if (health.status !== 'ok') {
                issues.push({
                    severity: 'error',
                    component: `${this.configService.getLLMProvider()} Connection`,
                    message: health.error || 'Could not connect to LLM provider',
                    suggestion: 'Check your internet connection and API configuration'
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Connectivity validation failed: ${message}`);

            issues.push({
                severity: 'error',
                component: 'LLM Provider Connection',
                message: `Failed to connect: ${message}`,
                suggestion: 'Check your network connection and LLM provider status'
            });
        }

        return issues;
    }

    /**
     * Check if configuration is ready for test generation
     */
    async isReadyForGeneration(): Promise<boolean> {
        const result = await this.validateAll();
        return result.isValid;
    }

    /**
     * Get validation issues formatted for display
     */
    getIssuesSummary(result: ValidationResult): string {
        if (result.isValid) {
            return 'All checks passed!';
        }

        const errors = result.issues.filter((i) => i.severity === 'error');
        const warnings = result.issues.filter((i) => i.severity === 'warning');

        let summary = '';

        if (errors.length > 0) {
            summary += `❌ ${errors.length} error(s):\n`;
            errors.forEach((issue) => {
                summary += `  • ${issue.component}: ${issue.message}\n`;
                if (issue.suggestion) {
                    summary += `    → ${issue.suggestion}\n`;
                }
            });
        }

        if (warnings.length > 0) {
            summary += `⚠ ${warnings.length} warning(s):\n`;
            warnings.forEach((issue) => {
                summary += `  • ${issue.component}: ${issue.message}\n`;
                if (issue.suggestion) {
                    summary += `    → ${issue.suggestion}\n`;
                }
            });
        }

        return summary;
    }

    /**
     * Log validation results
     */
    logValidationResults(result: ValidationResult): void {
        if (result.isValid) {
            Logger.log('✓ All validations passed');
        } else {
            Logger.log('✗ Validation failed:');
            result.issues.forEach((issue) => {
                const level = issue.severity === 'error' ? 'error' : 'warn';
                Logger[level](`  ${issue.component}: ${issue.message}`);
            });
        }
    }
}
