import { getInDegree, getTransitiveDependencies } from "../graph.js";
import type { DependencyGraph, FileEntry } from "../types.js";

const DISTANCE_SCORES: Record<number, number> = {
	0: 1.0,
	1: 0.8,
	2: 0.6,
	3: 0.4,
};
const MIN_DISTANCE_SCORE = 0.2;
const IN_DEGREE_BOOST_MAX = 0.1;

export function scoreByEntryExpansion(
	files: FileEntry[],
	graph: DependencyGraph,
	entryPoints: string[],
): Map<string, number> {
	const scores = new Map<string, number>();

	if (entryPoints.length === 0) {
		for (const file of files) {
			scores.set(file.path, 0);
		}
		return scores;
	}

	const distances = getTransitiveDependencies(graph, entryPoints);
	const reachable = new Set(distances.keys());
	const inDegrees = getInDegree(graph, reachable);

	// Find max in-degree for normalization
	let maxInDegree = 0;
	for (const deg of inDegrees.values()) {
		if (deg > maxInDegree) maxInDegree = deg;
	}

	for (const file of files) {
		const dist = distances.get(file.path);
		if (dist === undefined) {
			scores.set(file.path, 0);
			continue;
		}

		const baseScore = DISTANCE_SCORES[dist] ?? MIN_DISTANCE_SCORE;

		// In-degree boost: files imported by many files in the subgraph are more important
		const inDeg = inDegrees.get(file.path) ?? 0;
		const inDegreeBoost = maxInDegree > 0 ? (inDeg / maxInDegree) * IN_DEGREE_BOOST_MAX : 0;

		scores.set(file.path, Math.min(1, baseScore + inDegreeBoost));
	}

	return scores;
}
