export type FileEntry = {
	path: string;
	absolutePath: string;
	content: string;
	tokenCount: number;
	language: string;
	imports: string[];
	exports: string[];
};

export type ScoreBreakdown = {
	entryExpansion: number;
	keywordMatch: number;
	semanticRank: number;
};

export type ScoredFile = FileEntry & {
	score: number;
	scoreBreakdown: ScoreBreakdown;
	reason: string;
};

export type PackResult = {
	files: ScoredFile[];
	excluded: ScoredFile[];
	totalTokens: number;
	budgetTokens: number;
	budgetUsedPercent: number;
};

export type ScorerWeights = {
	entryExpansion: number;
	keywordMatch: number;
	semanticRank: number;
};

export type AiConfig = {
	provider: string;
	model: string;
};

export type ContextPackConfig = {
	tokenBudget: number;
	include: string[];
	exclude: string[];
	alwaysInclude: string[];
	weights: ScorerWeights;
	ai: AiConfig;
};

export type ImportInfo = {
	raw: string;
	resolved: string | null;
	isRelative: boolean;
	isPackage: boolean;
};

export type ImportParserResult = {
	imports: ImportInfo[];
};

export type ImportParser = {
	languages: string[];
	parse: (content: string, filePath: string, cwd?: string) => ImportParserResult;
};

export type DependencyGraph = {
	nodes: Map<string, FileEntry>;
	edges: Map<string, Set<string>>;
	reverseEdges: Map<string, Set<string>>;
};
