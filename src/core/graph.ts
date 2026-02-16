import { parseImports } from "./import-parser.js";
import type { DependencyGraph, FileEntry } from "./types.js";

export function buildDependencyGraph(files: FileEntry[], cwd: string): DependencyGraph {
	const nodes = new Map<string, FileEntry>();
	const edges = new Map<string, Set<string>>();
	const reverseEdges = new Map<string, Set<string>>();

	// Index all files by path
	for (const file of files) {
		nodes.set(file.path, file);
		edges.set(file.path, new Set());
		reverseEdges.set(file.path, new Set());
	}

	// Parse imports and build edges
	for (const file of files) {
		const result = parseImports(file.content, file.path, file.language, cwd);
		const resolvedImports: string[] = [];

		for (const imp of result.imports) {
			if (imp.resolved && nodes.has(imp.resolved)) {
				edges.get(file.path)?.add(imp.resolved);
				reverseEdges.get(imp.resolved)?.add(file.path);
				resolvedImports.push(imp.resolved);
			}
		}

		file.imports = resolvedImports;
	}

	return { nodes, edges, reverseEdges };
}

export function getTransitiveDependencies(
	graph: DependencyGraph,
	entryPoints: string[],
): Map<string, number> {
	const distances = new Map<string, number>();
	const queue: Array<{ path: string; distance: number }> = [];

	for (const entry of entryPoints) {
		if (graph.nodes.has(entry)) {
			distances.set(entry, 0);
			queue.push({ path: entry, distance: 0 });
		}
	}

	while (queue.length > 0) {
		const item = queue.shift();
		if (!item) break;
		const { path, distance } = item;
		const deps = graph.edges.get(path);
		if (!deps) continue;

		for (const dep of deps) {
			const existing = distances.get(dep);
			if (existing === undefined || existing > distance + 1) {
				distances.set(dep, distance + 1);
				queue.push({ path: dep, distance: distance + 1 });
			}
		}
	}

	return distances;
}

export function getInDegree(
	graph: DependencyGraph,
	subgraphPaths: Set<string>,
): Map<string, number> {
	const inDegree = new Map<string, number>();

	for (const path of subgraphPaths) {
		const importers = graph.reverseEdges.get(path);
		if (!importers) {
			inDegree.set(path, 0);
			continue;
		}

		let count = 0;
		for (const imp of importers) {
			if (subgraphPaths.has(imp)) count++;
		}
		inDegree.set(path, count);
	}

	return inDegree;
}
