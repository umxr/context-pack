import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getParserForLanguage, parseImports } from "../../src/core/import-parser.js";

const FIXTURE_DIR = resolve(__dirname, "../fixtures/sample-project");

describe("import-parser", () => {
	describe("getParserForLanguage", () => {
		it("returns parser for typescript", () => {
			const parser = getParserForLanguage("typescript");
			expect(parser).not.toBeNull();
			expect(parser!.languages).toContain("typescript");
		});

		it("returns parser for python", () => {
			const parser = getParserForLanguage("python");
			expect(parser).not.toBeNull();
		});

		it("returns parser for go", () => {
			const parser = getParserForLanguage("go");
			expect(parser).not.toBeNull();
		});

		it("returns parser for rust", () => {
			const parser = getParserForLanguage("rust");
			expect(parser).not.toBeNull();
		});

		it("returns null for unknown language", () => {
			expect(getParserForLanguage("brainfuck")).toBeNull();
		});
	});

	describe("TypeScript/JavaScript parser", () => {
		it("parses named imports", () => {
			const content = `import { foo, bar } from './utils';`;
			const result = parseImports(content, "src/index.ts", "typescript");
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].raw).toBe("./utils");
			expect(result.imports[0].isRelative).toBe(true);
			expect(result.imports[0].isPackage).toBe(false);
		});

		it("parses default imports", () => {
			const content = `import bar from './bar';`;
			const result = parseImports(content, "src/index.ts", "typescript");
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].raw).toBe("./bar");
		});

		it("parses namespace imports", () => {
			const content = `import * as utils from '../utils/bar';`;
			const result = parseImports(content, "src/auth/login.ts", "typescript");
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].raw).toBe("../utils/bar");
		});

		it("parses re-exports", () => {
			const content = `export { foo } from './bar';`;
			const result = parseImports(content, "src/index.ts", "typescript");
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].raw).toBe("./bar");
		});

		it("parses require calls", () => {
			const content = `const bar = require('./bar');`;
			const result = parseImports(content, "src/index.ts", "javascript");
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].raw).toBe("./bar");
		});

		it("parses dynamic imports", () => {
			const content = `const mod = await import('./dynamic');`;
			const result = parseImports(content, "src/index.ts", "typescript");
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].raw).toBe("./dynamic");
		});

		it("identifies package imports", () => {
			const content = `import express from 'express';`;
			const result = parseImports(content, "src/index.ts", "typescript");
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].isPackage).toBe(true);
			expect(result.imports[0].isRelative).toBe(false);
		});

		it("deduplicates same import", () => {
			const content = `
import { foo } from './bar';
import { baz } from './bar';
`;
			const result = parseImports(content, "src/index.ts", "typescript");
			expect(result.imports).toHaveLength(1);
		});

		it("resolves imports against fixture project", () => {
			const content = `import { hashPassword } from "../utils/hash";`;
			const result = parseImports(content, "src/auth/login.ts", "typescript", FIXTURE_DIR);
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].resolved).toBe("src/utils/hash.ts");
		});

		it("resolves type imports", () => {
			const content = `import type { User, AuthResult } from "./types";`;
			const result = parseImports(content, "src/auth/login.ts", "typescript", FIXTURE_DIR);
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].resolved).toBe("src/auth/types.ts");
		});

		it("returns null for unresolvable imports", () => {
			const content = `import { foo } from "./nonexistent";`;
			const result = parseImports(content, "src/index.ts", "typescript", FIXTURE_DIR);
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].resolved).toBeNull();
		});
	});

	describe("Python parser", () => {
		it("parses from...import", () => {
			const content = "from foo.bar import baz";
			const result = parseImports(content, "main.py", "python");
			expect(result.imports.length).toBeGreaterThan(0);
			expect(result.imports[0].raw).toBe("foo.bar");
			expect(result.imports[0].isPackage).toBe(true);
		});

		it("parses relative imports", () => {
			const content = "from . import bar";
			const result = parseImports(content, "pkg/main.py", "python");
			const relImport = result.imports.find((i) => i.isRelative);
			expect(relImport).toBeDefined();
		});

		it("parses absolute import", () => {
			const content = "import os.path";
			const result = parseImports(content, "main.py", "python");
			expect(result.imports.length).toBeGreaterThan(0);
			expect(result.imports[0].raw).toBe("os.path");
		});
	});

	describe("Go parser", () => {
		it("parses single import", () => {
			const content = `import "fmt"`;
			const result = parseImports(content, "main.go", "go");
			expect(result.imports).toHaveLength(1);
			expect(result.imports[0].raw).toBe("fmt");
			expect(result.imports[0].isPackage).toBe(true);
		});

		it("parses import block", () => {
			const content = `
import (
	"fmt"
	"os"
	"github.com/user/pkg"
)`;
			const result = parseImports(content, "main.go", "go");
			expect(result.imports.length).toBe(3);
		});

		it("identifies relative Go imports", () => {
			const content = `import "./internal/auth"`;
			const result = parseImports(content, "main.go", "go");
			expect(result.imports[0].isRelative).toBe(true);
		});
	});

	describe("Rust parser", () => {
		it("parses use statements", () => {
			const content = "use crate::auth::login;";
			const result = parseImports(content, "src/main.rs", "rust");
			expect(result.imports.length).toBeGreaterThan(0);
			expect(result.imports[0].raw).toBe("crate::auth::login");
			expect(result.imports[0].isRelative).toBe(true);
		});

		it("parses mod declarations", () => {
			const content = "mod session;";
			const result = parseImports(content, "src/main.rs", "rust");
			expect(result.imports.length).toBeGreaterThan(0);
			expect(result.imports[0].raw).toBe("session");
		});
	});
});
