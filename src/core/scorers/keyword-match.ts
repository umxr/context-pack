import type { FileEntry } from "../types.js";

const STOP_WORDS = new Set([
	"the",
	"a",
	"an",
	"is",
	"to",
	"for",
	"in",
	"of",
	"and",
	"or",
	"on",
	"at",
	"by",
	"it",
	"be",
	"as",
	"do",
	"if",
	"so",
	"no",
	"up",
	"we",
	"my",
	"me",
	"he",
	"that",
	"this",
	"with",
	"from",
	"but",
	"not",
	"are",
	"was",
	"has",
	"had",
	"have",
	"been",
	"will",
	"can",
	"its",
	"all",
	"any",
	"our",
	"out",
	"you",
	"her",
	"his",
	"how",
	"may",
	"get",
	"set",
	"new",
	"now",
	"old",
	"see",
	"way",
	"who",
	"did",
	"use",
	"each",
	"make",
	"just",
	"than",
	"them",
	"then",
	"when",
	"what",
	"some",
	"into",
	"over",
	"such",
	"take",
	"also",
	"back",
	"after",
	"only",
	"come",
	"made",
	"about",
	"could",
	"would",
	"should",
	"these",
	"those",
	"being",
	"other",
	"which",
	"their",
	"there",
	"where",
	"while",
	"need",
	"needs",
]);

export function extractKeywords(taskDescription: string): string[] {
	// Split on non-alphanumeric characters (preserve case for camelCase splitting)
	const words = taskDescription.split(/[^a-zA-Z0-9]+/);

	// Split camelCase and snake_case
	const expanded: string[] = [];
	for (const word of words) {
		if (!word) continue;

		// Split camelCase before lowering: loginSession -> login, Session -> login, session
		const camelParts = word.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
		for (const part of camelParts.split(/\s+/)) {
			if (part.length >= 2 && !STOP_WORDS.has(part)) {
				expanded.push(part);
			}
		}
	}

	// Deduplicate
	return [...new Set(expanded)];
}

const FILENAME_MATCH_SCORE = 0.3;
const CONTENT_MATCH_SCORE = 0.1;
const CONTENT_MATCH_CAP = 0.5;
const DOC_MULTIPLIER = 1.5;

export function scoreByKeywordMatch(files: FileEntry[], keywords: string[]): Map<string, number> {
	const scores = new Map<string, number>();

	if (keywords.length === 0) {
		for (const file of files) {
			scores.set(file.path, 0);
		}
		return scores;
	}

	let maxRawScore = 0;

	const rawScores: Array<{ path: string; score: number }> = [];

	for (const file of files) {
		let rawScore = 0;
		const pathLower = file.path.toLowerCase();
		const contentLower = file.content.toLowerCase();

		for (const kw of keywords) {
			// Filename/path match
			if (pathLower.includes(kw)) {
				rawScore += FILENAME_MATCH_SCORE;
			}

			// Content matches (count occurrences, diminishing returns)
			const regex = new RegExp(escapeRegex(kw), "gi");
			const matches = file.content.match(regex);
			if (matches) {
				const contentScore = Math.min(matches.length * CONTENT_MATCH_SCORE, CONTENT_MATCH_CAP);
				rawScore += contentScore;
			}
		}

		// Doc/spec boost
		const isDoc =
			file.language === "markdown" || file.path.includes("docs/") || file.path.includes("spec");
		if (isDoc && rawScore > 0) {
			rawScore *= DOC_MULTIPLIER;
		}

		rawScores.push({ path: file.path, score: rawScore });
		if (rawScore > maxRawScore) maxRawScore = rawScore;
	}

	// Normalize to 0-1
	for (const { path, score } of rawScores) {
		scores.set(path, maxRawScore > 0 ? score / maxRawScore : 0);
	}

	return scores;
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
