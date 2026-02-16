// v1.0 — LLM file ranking prompt

export const RANK_RELEVANCE_VERSION = "1.0";

export function buildRankRelevancePrompt(
	taskDescription: string,
	fileSummaries: Array<{
		path: string;
		language: string;
		tokenCount: number;
		preview: string;
		exports: string[];
	}>,
): { system: string; user: string } {
	const system = `You are a code relevance ranker. Given a task description and a list of files from a codebase, rank each file by how relevant it is to completing the task.

Return a JSON array of objects with this exact schema:
[
  {
    "path": "file/path.ts",
    "relevance": 0.85,
    "reason": "Brief explanation of why this file is relevant"
  }
]

Rules:
- "relevance" must be a number between 0 and 1
- Only include files with relevance > 0.1
- Sort by relevance descending
- Be precise: a file that is tangentially related should score 0.2-0.4, directly related 0.6-0.8, critical 0.9-1.0
- Consider: Does this file need to be read to understand the task? Would modifying this file be part of the solution? Does it define types/interfaces used by the task?`;

	const fileList = fileSummaries
		.map((f) => {
			const exportsStr = f.exports.length > 0 ? `\nExports: ${f.exports.join(", ")}` : "";
			return `### ${f.path} (${f.language}, ${f.tokenCount} tokens)${exportsStr}\n\`\`\`\n${f.preview}\n\`\`\``;
		})
		.join("\n\n");

	const user = `## Task\n${taskDescription}\n\n## Files\n${fileList}\n\nReturn the JSON ranking array. Only JSON, no other text.`;

	return { system, user };
}
