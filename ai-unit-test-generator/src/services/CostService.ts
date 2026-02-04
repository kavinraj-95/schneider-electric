import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

interface CostEstimate {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
}

interface CostTracking {
    totalCost: number;
    currentMonthCost: number;
    testsGenerated: number;
    lastResetDate: string;
    monthlyBudget?: number;
    costByModel: { [key: string]: number };
}

export class CostService {
    private static readonly STORAGE_KEY = 'aiUnitTesting.costTracking';
    private static readonly COST_PER_1K_TOKENS = {
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Estimate cost for a test generation request
     */
    estimateCost(model: string, functionCount: number): CostEstimate {
        // Rough estimate: ~500 input tokens per function, ~1000 output tokens per function
        const inputTokensPerFunction = 500;
        const outputTokensPerFunction = 1000;

        const totalInputTokens = functionCount * inputTokensPerFunction;
        const totalOutputTokens = functionCount * outputTokensPerFunction;
        const totalTokens = totalInputTokens + totalOutputTokens;

        const costs = (CostService.COST_PER_1K_TOKENS as any)[model] || CostService.COST_PER_1K_TOKENS['gpt-3.5-turbo'];
        const inputCost = (totalInputTokens / 1000) * costs.input;
        const outputCost = (totalOutputTokens / 1000) * costs.output;
        const estimatedCost = inputCost + outputCost;

        return {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens,
            estimatedCost: Math.round(estimatedCost * 100) / 100 // Round to 2 decimal places
        };
    }

    /**
     * Track actual cost after API call
     */
    trackCost(model: string, inputTokens: number, outputTokens: number): void {
        const costs = (CostService.COST_PER_1K_TOKENS as any)[model] || CostService.COST_PER_1K_TOKENS['gpt-3.5-turbo'];
        const inputCost = (inputTokens / 1000) * costs.input;
        const outputCost = (outputTokens / 1000) * costs.output;
        const totalCost = inputCost + outputCost;

        const tracking = this.getCostTracking();
        tracking.totalCost += totalCost;
        tracking.currentMonthCost += totalCost;
        tracking.testsGenerated++;

        if (!tracking.costByModel[model]) {
            tracking.costByModel[model] = 0;
        }
        tracking.costByModel[model] += totalCost;

        this.saveCostTracking(tracking);
        Logger.log(`Cost tracked: $${totalCost.toFixed(2)} (Total: $${tracking.totalCost.toFixed(2)})`);
    }

    /**
     * Get current cost tracking information
     */
    getCostTracking(): CostTracking {
        const stored = this.context.globalState.get<CostTracking>(CostService.STORAGE_KEY);

        if (stored) {
            // Check if we need to reset monthly
            const lastReset = new Date(stored.lastResetDate);
            const now = new Date();

            if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
                // Reset monthly cost
                return {
                    ...stored,
                    currentMonthCost: 0,
                    lastResetDate: now.toISOString()
                };
            }

            return stored;
        }

        return {
            totalCost: 0,
            currentMonthCost: 0,
            testsGenerated: 0,
            lastResetDate: new Date().toISOString(),
            costByModel: {}
        };
    }

    /**
     * Save cost tracking information
     */
    private saveCostTracking(tracking: CostTracking): void {
        this.context.globalState.update(CostService.STORAGE_KEY, tracking);
    }

    /**
     * Get current month cost
     */
    getCurrentMonthCost(): number {
        return this.getCostTracking().currentMonthCost;
    }

    /**
     * Get total cost
     */
    getTotalCost(): number {
        return this.getCostTracking().totalCost;
    }

    /**
     * Get tests generated count
     */
    getTestsGeneratedCount(): number {
        return this.getCostTracking().testsGenerated;
    }

    /**
     * Set monthly budget
     */
    setMonthlyBudget(budget: number): void {
        const tracking = this.getCostTracking();
        tracking.monthlyBudget = budget;
        this.saveCostTracking(tracking);
    }

    /**
     * Get monthly budget
     */
    getMonthlyBudget(): number | undefined {
        return this.getCostTracking().monthlyBudget;
    }

    /**
     * Check if monthly budget is exceeded
     */
    isMonthlyBudgetExceeded(): boolean {
        const tracking = this.getCostTracking();
        if (!tracking.monthlyBudget) {
            return false;
        }
        return tracking.currentMonthCost >= tracking.monthlyBudget;
    }

    /**
     * Get monthly budget warning message
     */
    getMonthlyBudgetWarning(): string | null {
        const tracking = this.getCostTracking();
        if (!tracking.monthlyBudget) {
            return null;
        }

        const remaining = tracking.monthlyBudget - tracking.currentMonthCost;
        const percentage = (tracking.currentMonthCost / tracking.monthlyBudget) * 100;

        if (percentage >= 100) {
            return `⚠ Monthly budget exceeded! ($${tracking.currentMonthCost.toFixed(2)} / $${tracking.monthlyBudget.toFixed(2)})`;
        } else if (percentage >= 80) {
            return `⚠ Approaching monthly budget ($${tracking.currentMonthCost.toFixed(2)} / $${tracking.monthlyBudget.toFixed(2)}) - $${remaining.toFixed(2)} remaining`;
        } else if (percentage >= 50) {
            return `Monthly spending: $${tracking.currentMonthCost.toFixed(2)} / $${tracking.monthlyBudget.toFixed(2)}`;
        }

        return null;
    }

    /**
     * Format cost for display
     */
    formatCost(cost: number): string {
        return `$${cost.toFixed(2)}`;
    }

    /**
     * Get cost summary for UI display
     */
    getCostSummary(): string {
        const tracking = this.getCostTracking();
        const warning = this.getMonthlyBudgetWarning();

        let summary = `Total: ${this.formatCost(tracking.totalCost)} | This month: ${this.formatCost(tracking.currentMonthCost)}`;

        if (warning) {
            summary += ` | ${warning}`;
        }

        return summary;
    }

    /**
     * Reset all tracking data
     */
    resetTracking(): void {
        this.context.globalState.update(CostService.STORAGE_KEY, {
            totalCost: 0,
            currentMonthCost: 0,
            testsGenerated: 0,
            lastResetDate: new Date().toISOString(),
            costByModel: {}
        });
        Logger.log('Cost tracking reset');
    }
}
