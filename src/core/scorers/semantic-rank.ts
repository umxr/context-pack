import { buildRankRelevancePrompt } from "../../prompts/rank-relevance.js";
import type { FileEntry } from "../types.js";

export type SemanticRankOptions = {
	apiKey?: string;
	provider?: string;
	model?: string;
};

type RankResult = {
	path: string;
	relevance: number;
	reason: string;
};

function getFilePreview(content: string, lines = 5): string {
	return content.split("\n").slice(0, lines).join("\n");
}

function extractExportNames(content: string, language: string): string[] {
	if (language !== "typescript" && language !== "javascript") return [];

	const exports: string[] = [];
	const patterns = [
		/export\s+(?:async\s+)?function\s+(\w+)/g,
		/export\s+(?:const|let|var)\s+(\w+)/g,
		/export\s+(?:class|interface|type|enum)\s+(\w+)/g,
		/export\s+default\s+(?:class|function)\s+(\w+)/g,
	];

	for (const pattern of patterns) {
		for (const match of content.matchAll(pattern)) {
			exports.push(match[1]);
		}
	}

	return exports;
}

export async function scoreBySemanticRank(
	files: FileEntry[],
	taskDescription: string,
	options: SemanticRankOptions = {},
): Promise<Map<string, number>> {
	const scores = new Map<string, number>();
	const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;

	if (!apiKey) {
		return scores;
	}

	// Take top 50 files (by token count as proxy — caller should pre-filter by static score)
	const topFiles = files.slice(0, 50);

	const summaries = topFiles.map((f) => ({
		path: f.path,
		language: f.language,
		tokenCount: f.tokenCount,
		preview: getFilePreview(f.content),
		exports: extractExportNames(f.content, f.language),
	}));

	const { system, user } = buildRankRelevancePrompt(taskDescription, summaries);

	try {
		const provider = options.provider ?? "anthropic";
		const model = options.model ?? "claude-sonnet-4-20250514";

		let rankings: RankResult[];

		if (provider === "anthropic") {
			rankings = await callAnthropic(apiKey, model, system, user);
		} else {
			// Fallback: no rankings if unknown provider
			return scores;
		}

		for (const rank of rankings) {
			scores.set(rank.path, rank.relevance);
		}
	} catch (error) {
		// Graceful degradation: return empty scores on LLM failure
		if (process.env.DEBUG || process.env.VERBOSE) {
			console.error("[semantic-rank] LLM call failed:", error);
		}
	}

	return scores;
}

async function callAnthropic(
	apiKey: string,
	model: string,
	system: string,
	user: string,
): Promise<RankResult[]> {
	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
		},
		body: JSON.stringify({
			model,
			max_tokens: 4096,
			system,
			messages: [{ role: "user", content: user }],
		}),
	});

	if (!response.ok) {
		throw new Error(`Anthropic API error: ${response.status}`);
	}

	const data = (await response.json()) as {
		content: Array<{ type: string; text: string }>;
	};
	const text = data.content
		.filter((c) => c.type === "text")
		.map((c) => c.text)
		.join("");

	return parseRankResponse(text);
}

function parseRankResponse(text: string): RankResult[] {
	// Try direct JSON parse
	try {
		const parsed = JSON.parse(text);
		if (Array.isArray(parsed)) return parsed;
	} catch {
		// Try extracting JSON from markdown code fence
		const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (fenceMatch) {
			try {
				const parsed = JSON.parse(fenceMatch[1]);
				if (Array.isArray(parsed)) return parsed;
			} catch {
				// Give up
			}
		}
	}
	return [];
}
