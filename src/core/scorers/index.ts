import type { DependencyGraph, FileEntry, ScoredFile, ScorerWeights } from "../types.js";
import { scoreByEntryExpansion } from "./entry-expansion.js";
import { extractKeywords, scoreByKeywordMatch } from "./keyword-match.js";

export type ScoreOptions = {
	files: FileEntry[];
	graph: DependencyGraph;
	entryPoints: string[];
	taskDescription: string;
	weights: ScorerWeights;
	semanticScores?: Map<string, number>;
};

export function scoreFiles(options: ScoreOptions): ScoredFile[] {
	const { files, graph, entryPoints, taskDescription, weights, semanticScores } = options;

	const keywords = extractKeywords(taskDescription);
	const entryScores = scoreByEntryExpansion(files, graph, entryPoints);
	const keywordScores = scoreByKeywordMatch(files, keywords);

	const scoredFiles: ScoredFile[] = files.map((file) => {
		const entryScore = entryScores.get(file.path) ?? 0;
		const kwScore = keywordScores.get(file.path) ?? 0;
		const semScore = semanticScores?.get(file.path) ?? 0;

		// Calculate active weight sum for normalization
		let activeWeightSum = 0;
		if (entryPoints.length > 0) activeWeightSum += weights.entryExpansion;
		activeWeightSum += weights.keywordMatch;
		if (semanticScores) activeWeightSum += weights.semanticRank;

		// If no active weights, use equal weighting on keyword match
		if (activeWeightSum === 0) activeWeightSum = 1;

		let combined = 0;
		if (entryPoints.length > 0) {
			combined += (weights.entryExpansion / activeWeightSum) * entryScore;
		}
		combined += (weights.keywordMatch / activeWeightSum) * kwScore;
		if (semanticScores) {
			combined += (weights.semanticRank / activeWeightSum) * semScore;
		}

		const reasons: string[] = [];
		if (entryScore > 0) {
			if (entryScore >= 1.0) reasons.push("Entry point");
			else if (entryScore >= 0.7) reasons.push("Direct dependency");
			else reasons.push("Transitive dependency");
		}
		if (kwScore > 0.3)
			reasons.push(
				`Keyword match (${keywords
					.filter(
						(kw) => file.path.toLowerCase().includes(kw) || file.content.toLowerCase().includes(kw),
					)
					.slice(0, 3)
					.join(", ")})`,
			);
		if (semScore > 0.5) reasons.push("AI-ranked relevant");
		if (
			file.language === "markdown" &&
			(file.path.includes("docs/") || file.path.includes("spec"))
		) {
			reasons.push("Spec/doc file");
		}

		return {
			...file,
			score: Math.min(1, combined),
			scoreBreakdown: {
				entryExpansion: entryScore,
				keywordMatch: kwScore,
				semanticRank: semScore,
			},
			reason: reasons.join(", ") || "Low relevance",
		};
	});

	// Sort by score descending
	scoredFiles.sort((a, b) => b.score - a.score);
	return scoredFiles;
}

export { extractKeywords } from "./keyword-match.js";
