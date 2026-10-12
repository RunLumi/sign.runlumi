import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		{
			name: "worker-binary-module-fixtures",
			async load(id) {
				if (!id.endsWith(".bin")) return null;
				const bytes = await readFile(id);
				return `export default Uint8Array.from(${JSON.stringify([...bytes])}).buffer;`;
			},
		},
	],
	resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
	test: {
		globals: true,
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		exclude: ["src/routes/**"],
	},
});
