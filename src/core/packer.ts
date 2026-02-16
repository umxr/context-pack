import type { PackResult, ScoredFile } from "./types.js";

const WRAPPER_TOKENS_PER_FILE = 20;

export function packFiles(
	scoredFiles: ScoredFile[],
	budgetTokens: number,
	alwaysInclude: string[] = [],
): PackResult {
	const included: ScoredFile[] = [];
	const excluded: ScoredFile[] = [];
	let totalTokens = 0;

	const alwaysIncludeSet = new Set(alwaysInclude.map((p) => p.replace(/^\.\//, "")));

	// First pass: always-include files
	const remaining: ScoredFile[] = [];
	for (const file of scoredFiles) {
		if (alwaysIncludeSet.has(file.path)) {
			const cost = file.tokenCount + WRAPPER_TOKENS_PER_FILE;
			totalTokens += cost;
			included.push(file);
		} else {
			remaining.push(file);
		}
	}

	// Second pass: fill by score order (already sorted desc)
	for (const file of remaining) {
		const cost = file.tokenCount + WRAPPER_TOKENS_PER_FILE;
		if (totalTokens + cost <= budgetTokens) {
			totalTokens += cost;
			included.push(file);
		} else {
			excluded.push(file);
		}
	}

	return {
		files: included,
		excluded,
		totalTokens,
		budgetTokens,
		budgetUsedPercent:
			budgetTokens > 0 ? Math.round((totalTokens / budgetTokens) * 100 * 100) / 100 : 0,
	};
}
