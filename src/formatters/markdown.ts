import type { PackResult } from "../core/types.js";

export function formatMarkdown(result: PackResult, taskDescription: string): string {
	const lines: string[] = [];

	lines.push("# Context Pack");
	lines.push(`**Task:** ${taskDescription}`);
	lines.push(
		`**Files:** ${result.files.length} | **Tokens:** ${result.totalTokens.toLocaleString()} / ${result.budgetTokens.toLocaleString()} budget`,
	);
	lines.push("");

	for (const file of result.files) {
		lines.push(`## File: ${file.path}`);
		lines.push(`**Score:** ${file.score.toFixed(2)} | **Reason:** ${file.reason}`);
		lines.push(`**Language:** ${file.language}`);
		lines.push("");
		lines.push(`\`\`\`${file.language}`);
		lines.push(file.content);
		lines.push("```");
		lines.push("");
	}

	return lines.join("\n");
}
