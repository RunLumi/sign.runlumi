// Demo seeding is intentionally local. Production users enter through verified email.
import { spawnSync } from "node:child_process";

const result = spawnSync(
	"pnpm",
	[
		"exec",
		"wrangler",
		"d1",
		"execute",
		"signmos-dev",
		"--local",
		"--command",
		"INSERT OR IGNORE INTO clients (id, name, surname, email) VALUES ('00000000-0000-4000-8000-000000000001', 'Demo', 'Client', 'demo@example.com')",
	],
	{ stdio: "inherit" },
);
process.exit(result.status ?? 1);
