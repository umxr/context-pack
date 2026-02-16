import { existsSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import type { ImportInfo, ImportParser, ImportParserResult } from "./types.js";

function resolveRelativeImport(raw: string, fromFile: string, cwd: string): string | null {
	const dir = dirname(resolve(cwd, fromFile));
	const base = resolve(dir, raw);

	const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
	const indexFiles = extensions.map((ext) => `index${ext}`);

	// Exact match (already has extension)
	if (extname(base) && existsSync(base)) {
		return base;
	}

	// Try adding extensions
	for (const ext of extensions) {
		const candidate = `${base}${ext}`;
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	// Try as directory with index file
	for (const idx of indexFiles) {
		const candidate = resolve(base, idx);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
}

function makeRelativeToCwd(absolutePath: string, cwd: string): string {
	const absCwd = resolve(cwd);
	if (!absolutePath.startsWith(absCwd)) return absolutePath;
	const rel = absolutePath.slice(absCwd.length);
	return rel.startsWith("/") ? rel.slice(1) : rel;
}

function execAll(pattern: RegExp, text: string): RegExpExecArray[] {
	const results: RegExpExecArray[] = [];
	for (const m of text.matchAll(pattern)) {
		results.push(m as RegExpExecArray);
	}
	return results;
}

const tsJsParser: ImportParser = {
	languages: ["typescript", "javascript"],
	parse(content: string, filePath: string, cwd?: string): ImportParserResult {
		const imports: ImportInfo[] = [];
		const seen = new Set<string>();

		const patterns = [
			// import ... from '...'
			/import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
			// export ... from '...'
			/export\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
			// require('...')
			/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
			// import('...')
			/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		];

		for (const pattern of patterns) {
			for (const match of execAll(pattern, content)) {
				const raw = match[1];
				if (seen.has(raw)) continue;
				seen.add(raw);

				const isRelative = raw.startsWith(".");
				const isPackage = !isRelative;

				let resolved: string | null = null;
				if (isRelative && cwd) {
					const abs = resolveRelativeImport(raw, filePath, cwd);
					resolved = abs ? makeRelativeToCwd(abs, cwd) : null;
				}

				imports.push({ raw, resolved, isRelative, isPackage });
			}
		}

		return { imports };
	},
};

const pythonParser: ImportParser = {
	languages: ["python"],
	parse(content: string, _filePath: string, _cwd?: string): ImportParserResult {
		const imports: ImportInfo[] = [];
		const seen = new Set<string>();

		const patterns = [
			// from foo.bar import baz
			/from\s+([\w.]+)\s+import/g,
			// import foo.bar
			/^import\s+([\w.]+)/gm,
			// from . import bar / from ..utils import hash
			/from\s+(\.[\w.]*)\s+import/g,
		];

		for (const pattern of patterns) {
			for (const match of execAll(pattern, content)) {
				const raw = match[1];
				if (seen.has(raw)) continue;
				seen.add(raw);

				const isRelative = raw.startsWith(".");
				imports.push({
					raw,
					resolved: null,
					isRelative,
					isPackage: !isRelative,
				});
			}
		}

		return { imports };
	},
};

const goParser: ImportParser = {
	languages: ["go"],
	parse(content: string, _filePath: string, _cwd?: string): ImportParserResult {
		const imports: ImportInfo[] = [];
		const seen = new Set<string>();

		// Single import: import "path"
		const singlePattern = /import\s+"([^"]+)"/g;
		for (const match of execAll(singlePattern, content)) {
			const raw = match[1];
			if (!seen.has(raw)) {
				seen.add(raw);
				const isRelative = raw.startsWith("./") || raw.startsWith("../");
				imports.push({
					raw,
					resolved: null,
					isRelative,
					isPackage: !isRelative,
				});
			}
		}

		// Block import: import ( "path1"\n "path2" )
		const blockPattern = /import\s*\(([\s\S]*?)\)/g;
		for (const match of execAll(blockPattern, content)) {
			const block = match[1];
			const linePattern = /"([^"]+)"/g;
			for (const lineMatch of execAll(linePattern, block)) {
				const raw = lineMatch[1];
				if (!seen.has(raw)) {
					seen.add(raw);
					const isRelative = raw.startsWith("./") || raw.startsWith("../");
					imports.push({
						raw,
						resolved: null,
						isRelative,
						isPackage: !isRelative,
					});
				}
			}
		}

		return { imports };
	},
};

const rustParser: ImportParser = {
	languages: ["rust"],
	parse(content: string, _filePath: string, _cwd?: string): ImportParserResult {
		const imports: ImportInfo[] = [];
		const seen = new Set<string>();

		const patterns = [
			// use crate::auth::login;
			/use\s+((?:crate|super|self)(?:::\w+)+)/g,
			// mod session;
			/mod\s+(\w+)\s*;/g,
		];

		for (const pattern of patterns) {
			for (const match of execAll(pattern, content)) {
				const raw = match[1];
				if (!seen.has(raw)) {
					seen.add(raw);
					const isRelative =
						raw.startsWith("crate::") || raw.startsWith("super::") || raw.startsWith("self::");
					imports.push({
						raw,
						resolved: null,
						isRelative,
						isPackage: !isRelative && !pattern.source.startsWith("mod"),
					});
				}
			}
		}

		return { imports };
	},
};

const parsers: ImportParser[] = [tsJsParser, pythonParser, goParser, rustParser];

export function getParserForLanguage(language: string): ImportParser | null {
	return parsers.find((p) => p.languages.includes(language)) ?? null;
}

export function parseImports(
	content: string,
	filePath: string,
	language: string,
	cwd?: string,
): ImportParserResult {
	const parser = getParserForLanguage(language);
	if (!parser) return { imports: [] };

	return parser.parse(content, filePath, cwd);
}

export { tsJsParser, pythonParser, goParser, rustParser };
