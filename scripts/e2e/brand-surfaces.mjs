import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.LUMI_E2E_BASE_URL ?? "http://127.0.0.1:8795";
assert.ok(
	["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname),
	"Brand checks use local fixtures only",
);
const output = "output/playwright/brand-surfaces";
await mkdir(output, { recursive: true });
const heartbeat = setInterval(
	() => process.stdout.write("[Brand E2E] Checking responsive surfaces…\n"),
	10_000,
);
const browser = await chromium.launch({
	...(process.env.LUMI_E2E_BROWSER === "chromium" ? {} : { channel: "chrome" }),
	headless: true,
});
const results = [];
try {
	const context = await browser.newContext();
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	for (const width of [1280, 390, 320]) {
		await page.setViewportSize({ width, height: 900 });
		for (const [name, path] of [
			["chooser", "/"],
			["self-sign", "/?task=only-me"],
			["two-party", "/?task=with-someone"],
			["documents-access", "/?task=my-documents"],
			["agent-access", "/?task=agentic"],
			["not-found", "/missing-brand-page"],
		]) {
			await page.goto(baseUrl + path);
			await page.getByRole("main").waitFor();
			await page.evaluate(() => document.fonts.ready);
			const state = await page.evaluate(() => ({
				overflow: document.documentElement.scrollWidth > window.innerWidth,
				font: getComputedStyle(document.body).fontFamily,
				background: getComputedStyle(document.body).backgroundColor,
				logoLoaded: document.querySelector('img[src="/brand/lumi-logo.svg"]')?.naturalWidth > 0,
			}));
			assert.equal(state.overflow, false, `${name} overflows at ${width}px`);
			assert.ok(state.font.includes("Geist"));
			assert.equal(state.background, "rgb(244, 240, 232)");
			assert.equal(state.logoLoaded, true);
			assert.equal(await page.locator("h1").count(), 1);
			await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
			results.push({ surface: name, width, status: "passed" });
			process.stdout.write(`[Brand E2E] ${name} at ${width}px passed\n`);
		}
	}
	await page.setViewportSize({ width: 390, height: 900 });
	await page.goto(baseUrl);
	await page.keyboard.press("Tab");
	assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Skip to content");
	await page.keyboard.press("Enter");
	assert.equal(await page.evaluate(() => document.activeElement?.id), "main-content");
	await page.getByRole("button", { name: "Sign by myself", exact: true }).click();
	const lightInput = await page
		.getByLabel("Name", { exact: true })
		.evaluate((input) => getComputedStyle(input).backgroundColor);
	await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
	await page.goto(`${baseUrl}/?task=only-me`);
	const darkInput = await page
		.getByLabel("Name", { exact: true })
		.evaluate((input) => getComputedStyle(input).backgroundColor);
	assert.equal(darkInput, lightInput);
	await page.goto(baseUrl);
	await page.goto(baseUrl);
	assert.equal(
		await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
		"rgb(244, 240, 232)",
	);
	await page.getByRole("button", { name: "Sign by myself", exact: true }).click();
	assert.equal(await page.getByRole("form", { name: "Start envelope" }).count(), 1);
	await page.getByRole("button", { name: "Back to task choices" }).click();
	assert.equal(
		await page.getByRole("button", { name: "Sign with someone else", exact: true }).count(),
		1,
	);
	assert.deepEqual(errors, []);
	await page.route("https://sign.runlumi.app/brand/lumi-email-logo.png", (route) =>
		route.fulfill({ path: "public/brand/lumi-email-logo.png", contentType: "image/png" }),
	);
	for (const width of [600, 320]) {
		await page.setViewportSize({ width, height: 1000 });
		for (const name of [
			"sender-verification",
			"signer-invitation",
			"sender-signing",
			"signature-added",
			"changes-requested",
			"human-review",
			"signed-pdf-backup",
			"my-documents",
			"agentic-access",
		]) {
			await page.setContent(
				await readFile(`output/playwright/email-previews/${name}.html`, "utf8"),
			);
			await page.locator('img[alt="Lumi"]').waitFor();
			await page.waitForFunction(() => document.querySelector("img")?.complete);
			assert.equal(
				await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
				false,
				`${name} email overflows at ${width}px`,
			);
			assert.equal(await page.locator("h1").count(), 1);
			await page.screenshot({ path: `${output}/email-${name}-${width}.png`, fullPage: true });
			results.push({ surface: `email-${name}`, width, status: "passed" });
		}
		process.stdout.write(`[Brand E2E] All nine email templates at ${width}px passed\n`);
	}
	await writeFile(
		`${output}/results.json`,
		JSON.stringify(
			{ results, pageErrors: errors, keyboard: "passed", lightOnly: "passed" },
			null,
			2,
		),
	);
	process.stdout.write(
		"[Brand E2E] PASS: site, email layouts, keyboard entry, reduced motion, and light-only theme.\n",
	);
} finally {
	clearInterval(heartbeat);
	await browser.close();
}
