import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import fg from "fast-glob";
import { countTokens } from "./tokenizer.js";
import type { FileEntry } from "./types.js";

const LANGUAGE_MAP: Record<string, string> = {
	".ts": "typescript",
	".tsx": "typescript",
	".js": "javascript",
	".jsx": "javascript",
	".mjs": "javascript",
	".cjs": "javascript",
	".py": "python",
	".go": "go",
	".rs": "rust",
	".md": "markdown",
	".json": "json",
	".yaml": "yaml",
	".yml": "yaml",
	".toml": "toml",
	".html": "html",
	".css": "css",
	".scss": "scss",
	".sql": "sql",
	".sh": "shell",
	".bash": "shell",
	".zsh": "shell",
	".rb": "ruby",
	".java": "java",
	".kt": "kotlin",
	".swift": "swift",
	".c": "c",
	".cpp": "cpp",
	".h": "c",
	".hpp": "cpp",
};

const BINARY_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".bmp",
	".ico",
	".svg",
	".webp",
	".mp3",
	".mp4",
	".wav",
	".avi",
	".mov",
	".zip",
	".tar",
	".gz",
	".bz2",
	".7z",
	".rar",
	".pdf",
	".woff",
	".woff2",
	".ttf",
	".eot",
	".otf",
	".exe",
	".dll",
	".so",
	".dylib",
	".o",
	".a",
	".pyc",
	".pyo",
	".class",
	".jar",
	".wasm",
]);

const DEFAULT_EXCLUDE = [
	"**/node_modules/**",
	"**/.git/**",
	"**/dist/**",
	"**/build/**",
	"**/out/**",
	"**/coverage/**",
	"**/__pycache__/**",
	"**/*.lock",
	"**/*.map",
	"**/*.min.js",
	"**/*.min.css",
	"**/.DS_Store",
	"**/target/**",
];

export type ScanOptions = {
	include?: string[];
	exclude?: string[];
	cwd: string;
};

function detectLanguage(filePath: string): string {
	const ext = extname(filePath).toLowerCase();
	return LANGUAGE_MAP[ext] || "text";
}

function isBinaryFile(filePath: string): boolean {
	const ext = extname(filePath).toLowerCase();
	return BINARY_EXTENSIONS.has(ext);
}

export async function scanFiles(options: ScanOptions): Promise<FileEntry[]> {
	const { cwd, include = ["**/*"], exclude = [] } = options;
	const absoluteCwd = resolve(cwd);

	const allExcludes = [...DEFAULT_EXCLUDE, ...exclude];

	const paths = await fg(include, {
		cwd: absoluteCwd,
		ignore: allExcludes,
		dot: false,
		onlyFiles: true,
		followSymbolicLinks: true,
		absolute: false,
	});

	const entries: FileEntry[] = [];

	for (const filePath of paths) {
		if (isBinaryFile(filePath)) continue;

		const absolutePath = resolve(absoluteCwd, filePath);
		try {
			const content = await readFile(absolutePath, "utf-8");

			if (content.includes("\0")) continue;

			const tokenCount = countTokens(content);
			const language = detectLanguage(filePath);

			entries.push({
				path: filePath,
				absolutePath,
				content,
				tokenCount,
				language,
				imports: [],
				exports: [],
			});
		} catch {
			// Skip files that can't be read
		}
	}

	return entries;
}

export { DEFAULT_EXCLUDE, BINARY_EXTENSIONS, detectLanguage, isBinaryFile };
