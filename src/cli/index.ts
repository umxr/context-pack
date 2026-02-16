import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";
import { loadConfig } from "../core/config.js";
import { buildDependencyGraph } from "../core/graph.js";
import { packFiles } from "../core/packer.js";
import { scanFiles } from "../core/scanner.js";
import { scoreFiles } from "../core/scorers/index.js";
import { scoreBySemanticRank } from "../core/scorers/semantic-rank.js";
import { formatFilelist } from "../formatters/filelist.js";
import { formatJson } from "../formatters/json.js";
import { formatMarkdown } from "../formatters/markdown.js";

const program = new Command();

program
	.name("context-pack")
	.description("Optimal context window builder for AI agents")
	.version("0.1.0")
	.argument("[task]", "Task description")
	.option("--codebase <path>", "Path to codebase root", ".")
	.option("--entry <paths...>", "Entry point files for dependency expansion")
	.option("--budget <tokens>", "Token budget", "100000")
	.option("--format <type>", "Output format: markdown, filelist, json", "markdown")
	.option("--ai", "Enable AI-powered semantic ranking")
	.option("--out <path>", "Write output to file")
	.option("--dry-run", "Show what would be packed without content")
	.option("--verbose", "Show scoring details")
	.option("--always-include <paths...>", "Files to always include")
	.option("--include-docs", "Include docs/**/*.md in scan")
	.option("--task-file <path>", "Read task description from file")
	.option("--stdin", "Read task description from stdin")
	.option("--json", "Shorthand for --format json")
	.action(async (taskArg, opts) => {
		try {
			// Resolve task description
			let taskDescription = taskArg ?? "";

			if (opts.stdin) {
				taskDescription = await readStdin();
			} else if (opts.taskFile) {
				taskDescription = await readFile(resolve(opts.taskFile), "utf-8");
			}

			taskDescription = taskDescription.trim();
			if (!taskDescription) {
				console.error("Error: No task description provided.");
				console.error("Usage: context-pack <task> or --task-file <path> or --stdin");
				process.exit(2);
			}

			const cwd = resolve(opts.codebase);
			const format = opts.json ? "json" : opts.format;

			// Load config
			const config = await loadConfig(cwd, {
				tokenBudget: Number.parseInt(opts.budget, 10),
				alwaysInclude: opts.alwaysInclude,
			});

			// Include docs if flag set
			const includePatterns = [...config.include];
			if (opts.includeDocs) {
				includePatterns.push("docs/**/*.md");
			}

			if (opts.verbose) {
				console.error(`[context-pack] Scanning ${cwd}...`);
			}

			// Scan files
			const files = await scanFiles({
				cwd,
				include: includePatterns,
				exclude: config.exclude,
			});

			if (files.length === 0) {
				console.error("Error: No files found in codebase.");
				process.exit(1);
			}

			if (opts.verbose) {
				console.error(`[context-pack] Found ${files.length} files`);
			}

			// Build dependency graph
			const graph = buildDependencyGraph(files, cwd);

			// Resolve entry points
			const entryPoints: string[] = (opts.entry ?? []).map((e: string) => e.replace(/^\.\//, ""));

			// Semantic ranking (optional)
			let semanticScores: Map<string, number> | undefined;
			if (opts.ai) {
				if (opts.verbose) {
					console.error("[context-pack] Running AI semantic ranking...");
				}
				try {
					semanticScores = await scoreBySemanticRank(files, taskDescription, {
						provider: config.ai.provider,
						model: config.ai.model,
					});
					if (semanticScores.size === 0) {
						console.error(
							"Warning: AI ranking returned no results. Set ANTHROPIC_API_KEY for AI features.",
						);
						semanticScores = undefined;
					}
				} catch {
					console.error("Warning: AI ranking failed. Continuing with static scoring.");
				}
			}

			// Score files
			const scoredFiles = scoreFiles({
				files,
				graph,
				entryPoints,
				taskDescription,
				weights: config.weights,
				semanticScores,
			});

			// Pack files
			const result = packFiles(scoredFiles, config.tokenBudget, config.alwaysInclude);

			if (opts.verbose) {
				console.error(
					`[context-pack] Packed ${result.files.length} files (${result.totalTokens.toLocaleString()} tokens, ${result.budgetUsedPercent}% of budget)`,
				);
				if (result.excluded.length > 0) {
					console.error(`[context-pack] Excluded ${result.excluded.length} files`);
				}
			}

			// Dry run: show file list with scores
			if (opts.dryRun) {
				const lines: string[] = [];
				lines.push("Files to pack:");
				lines.push("");
				for (const f of result.files) {
					const warn = f.tokenCount > 10000 ? " ⚠ large file" : "";
					lines.push(
						`  ${f.score.toFixed(2)}  ${f.tokenCount.toString().padStart(6)} tok  ${f.path}  [${f.reason}]${warn}`,
					);
				}
				lines.push("");
				lines.push(
					`Total: ${result.files.length} files, ${result.totalTokens.toLocaleString()} / ${result.budgetTokens.toLocaleString()} tokens (${result.budgetUsedPercent}%)`,
				);

				if (result.excluded.length > 0) {
					lines.push("");
					lines.push("Excluded:");
					for (const f of result.excluded.slice(0, 10)) {
						lines.push(
							`  ${f.score.toFixed(2)}  ${f.tokenCount.toString().padStart(6)} tok  ${f.path}`,
						);
					}
					if (result.excluded.length > 10) {
						lines.push(`  ... and ${result.excluded.length - 10} more`);
					}
				}

				const output = lines.join("\n");
				if (opts.out) {
					await writeFile(resolve(opts.out), output);
				} else {
					console.log(output);
				}
				process.exit(0);
			}

			// Format output
			let output: string;
			switch (format) {
				case "json":
					output = formatJson(result);
					break;
				case "filelist":
					output = formatFilelist(result);
					break;
				default:
					output = formatMarkdown(result, taskDescription);
					break;
			}

			// Write output
			if (opts.out) {
				await writeFile(resolve(opts.out), output);
				if (opts.verbose) {
					console.error(`[context-pack] Output written to ${opts.out}`);
				}
			} else {
				process.stdout.write(output);
			}
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	});

function readStdin(): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = "";
		process.stdin.setEncoding("utf-8");
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => resolve(data));
		process.stdin.on("error", reject);
	});
}

program.parse();
