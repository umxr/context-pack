import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: { "cli/index": "src/cli/index.ts" },
		format: ["esm"],
		sourcemap: true,
		clean: true,
		target: "node20",
		banner: {
			js: "#!/usr/bin/env node",
		},
	},
	{
		entry: { index: "src/core/types.ts" },
		format: ["esm"],
		dts: true,
		sourcemap: true,
		target: "node20",
	},
]);
