import type { PackResult } from "../core/types.js";

export function formatJson(result: PackResult): string {
	const output = {
		files: result.files.map((f) => ({
			path: f.path,
			score: f.score,
			scoreBreakdown: f.scoreBreakdown,
			reason: f.reason,
			tokenCount: f.tokenCount,
			language: f.language,
		})),
		excluded: result.excluded.map((f) => ({
			path: f.path,
			score: f.score,
			scoreBreakdown: f.scoreBreakdown,
			reason: f.reason,
			tokenCount: f.tokenCount,
			language: f.language,
		})),
		totalTokens: result.totalTokens,
		budgetTokens: result.budgetTokens,
		budgetUsedPercent: result.budgetUsedPercent,
	};
	return JSON.stringify(output, null, 2);
}
