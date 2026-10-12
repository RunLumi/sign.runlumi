import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { unstable_readConfig } from "wrangler";

const repositoryRoot = resolve(import.meta.dirname, "../..");

function executable(path: string, body: string) {
	writeFileSync(path, `#!/usr/bin/env bash\nset -euo pipefail\n${body}`);
	chmodSync(path, 0o755);
}

function runDeploymentScript(mode: "--dry-run" | "--deploy", options: { gitStatus?: string } = {}) {
	const directory = mkdtempSync(join(tmpdir(), "signmos-production-deploy-"));
	const log = join(directory, "commands.log");
	executable(
		join(directory, "git"),
		'if [[ "$1" == "rev-parse" ]]; then printf "07c2b1c000000000000000000000000000000000\\n"; fi\n' +
			`if [[ "$1" == "status" ]]; then printf "%s" "\${DEPLOY_TEST_GIT_STATUS:-}"; fi\n`,
	);
	executable(
		join(directory, "pnpm"),
		`printf "pnpm|%s|%s\\n" "\${CLOUDFLARE_ENV:-unset}" "$*" >> "$DEPLOY_TEST_LOG"\n`,
	);
	executable(join(directory, "curl"), 'printf "curl|%s\\n" "$*" >> "$DEPLOY_TEST_LOG"\n');

	try {
		const result = spawnSync("bash", ["scripts/deploy-production.sh", mode], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				...process.env,
				DEPLOY_TEST_LOG: log,
				DEPLOY_TEST_GIT_STATUS: options.gitStatus ?? "",
				PATH: `${directory}:${process.env.PATH ?? ""}`,
			},
		});
		return {
			commands: existsSync(log) ? readFileSync(log, "utf8") : "",
			result,
			temporaryBuildVarsPresent: existsSync(resolve(repositoryRoot, ".dev.vars.production")),
		};
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
}

// Deployment contracts exercise public config and command boundaries without remote writes.
describe("production deployment", () => {
	it("publishes only the production Worker at the sign.runlumi.app custom domain", () => {
		const config = unstable_readConfig(
			{ config: "wrangler.jsonc", env: "production" },
			{ hideWarnings: true, preserveOriginalMain: true },
		);

		expect(config.name).toBe("signmos-production");
		expect(config.workers_dev).toBe(false);
		expect(config.preview_urls).toBe(false);
		expect(config.routes).toEqual([
			{
				pattern: "sign.runlumi.app",
				custom_domain: true,
			},
		]);
		expect(config.r2_buckets).toEqual([
			{
				binding: "DOCUMENTS_BUCKET",
				bucket_name: "signmos-documents-production",
			},
		]);
	});

	it("builds the production environment and proves the generated deployment without publishing", () => {
		const { commands, result, temporaryBuildVarsPresent } = runDeploymentScript("--dry-run");

		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toContain("Production deploy dry run passed");
		expect(temporaryBuildVarsPresent).toBe(false);
		expect(commands).toBe(
			[
				"pnpm|production|build",
				"pnpm|unset|exec wrangler deploy --config dist/server/wrangler.json --dry-run",
				"",
			].join("\n"),
		);
	});

	it("applies D1 migrations, publishes the exact commit, and checks public endpoints", () => {
		const { commands, result } = runDeploymentScript("--deploy");
		expect(result.status, result.stderr).toBe(0);
		expect(commands).toContain(
			"d1 migrations apply signmos-production --remote --config wrangler.jsonc --env production",
		);
		expect(commands).toContain("--message git:07c2b1c000000000000000000000000000000000");
		expect(commands).not.toContain("--secrets-file");
		for (const path of ["/", "/agent.md", "/openapi.json"]) {
			expect(commands).toContain(`https://sign.runlumi.app${path}`);
		}
	});

	it("refuses to publish a working tree that cannot be tied to one exact commit", () => {
		const { commands, result } = runDeploymentScript("--deploy", {
			gitStatus: " M README.md\n",
		});

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Production deploy requires a clean working tree");
		expect(commands).toBe("");
	});

	it("documents D1, Email Service, automatic deployment, and recovery", () => {
		const runbook = readFileSync(resolve(repositoryRoot, "docs/PRODUCTION_DEPLOYMENT.md"), "utf8");
		for (const phrase of [
			"D1",
			"Cloudflare Email Service",
			"sign.runlumi.app",
			"deploy.yml",
			"rollback",
			"--dry-run",
			"--deploy",
		]) {
			expect(runbook).toContain(phrase);
		}
	});

	it("links the guarded production command and runbook from the public README", () => {
		const readme = readFileSync(resolve(repositoryRoot, "README.md"), "utf8");

		expect(readme).toContain("[production deployment runbook](./docs/PRODUCTION_DEPLOYMENT.md)");
		expect(readme).toContain("`./scripts/deploy-production.sh --dry-run`");
		expect(readme).toContain("`./scripts/deploy-production.sh --deploy`");
	});
});
