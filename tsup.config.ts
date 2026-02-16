import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		"cli/index": "src/cli/index.ts",
		index: "src/core/types.ts",
	},
	format: ["esm"],
	dts: true,
	sourcemap: true,
	clean: true,
	target: "node20",
	banner: {
		js: "#!/usr/bin/env node",
	},
});
