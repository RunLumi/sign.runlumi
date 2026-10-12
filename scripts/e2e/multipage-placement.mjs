import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { PDFDocument, StandardFonts } from "pdf-lib";

const modulePath = process.env.PLAYWRIGHT_MODULE_PATH ?? "playwright";
const require = createRequire(import.meta.url);
const { chromium } = require(modulePath);
const baseUrl = process.env.LUMI_E2E_BASE_URL ?? "http://127.0.0.1:8795";
assert.ok(
	["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname),
	"This test only creates fixtures in a local environment",
);
const output = ".wrangler/e2e/multipage-placement";
await mkdir(output, { recursive: true });
const heartbeat = setInterval(
	() => process.stdout.write("[E2E] Multipage placement test is running…\n"),
	10_000,
);
let browser;
try {
	browser = await chromium.launch({
		...(process.env.LUMI_E2E_BROWSER === "chromium" ? {} : { channel: "chrome" }),
		headless: true,
	});
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		extraHTTPHeaders: { "x-internal-user-id": "ui-user" },
	});
	await context.tracing.start({ screenshots: true, snapshots: true });
	async function json(path, options = {}) {
		const response = await context.request.fetch(baseUrl + path, options);
		assert.ok(response.ok(), `${path} returned ${response.status()}: ${await response.text()}`);
		return response.json();
	}
	const envelope = await json("/api/envelopes", { method: "POST", data: {} });
	const id = envelope.data.id;
	const recipients = await json(`/api/envelopes/${id}/recipients`, {
		method: "POST",
		data: {
			recipients: [
				{ name: "E2E Sender", email: "sender@example.com" },
				{ name: "E2E Partner", email: "partner@example.com" },
			],
		},
	});
	const pdf = await PDFDocument.create();
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	for (let number = 1; number <= 2; number++) {
		const page = pdf.addPage([612, 792]);
		page.drawText(`E2E signature placement page ${number}`, { x: 72, y: 700, size: 20, font });
	}
	await json(`/api/envelopes/${id}/source-pdf`, {
		method: "POST",
		headers: { "content-type": "application/pdf" },
		data: Buffer.from(await pdf.save()),
	});
	const [sender, partner] = recipients.data;
	const query = new URLSearchParams({
		envelopeId: id,
		recipientId: sender.id,
		name: sender.name,
		email: sender.email,
		partnerRecipientId: partner.id,
		partnerName: partner.name,
		partnerEmail: partner.email,
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto(`${baseUrl}/envelope-fields?${query}`);
	const scroller = page.getByRole("region", { name: "Scrollable PDF pages" });
	const firstPage = page.getByTestId("pdf-page-1");
	const secondPage = page.getByTestId("pdf-page-2");
	await firstPage.locator('canvas[data-rendered="true"]').waitFor({ timeout: 30_000 });
	await secondPage.locator('canvas[data-rendered="true"]').waitFor({ timeout: 30_000 });
	async function dragCurrent() {
		await page
			.getByRole("button", { name: "Current signature placeholder" })
			.scrollIntoViewIfNeeded();
		const box = await page
			.getByRole("button", { name: "Current signature placeholder" })
			.boundingBox();
		assert.ok(box);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 40, { steps: 8 });
		await page.mouse.up();
	}
	await dragCurrent();
	await page.getByRole("button", { name: "Place E2E Sender signature", exact: true }).click();
	await firstPage
		.getByRole("img", { name: "E2E Sender signature placeholder", exact: true })
		.waitFor();
	await scroller.hover();
	await page.mouse.wheel(0, 1200);
	await page.waitForFunction(
		() => document.querySelector('select[aria-label="PDF page"]')?.value === "2",
	);
	assert.ok(
		(await scroller.evaluate((element) => element.scrollTop)) > 0,
		"Wheel scrolling must change the PDF page before using the page selector",
	);
	await page.getByRole("combobox", { name: "PDF page", exact: true }).selectOption("2");
	assert.ok(
		(await scroller.evaluate((element) => element.scrollTop)) > 0,
		"The PDF container must actually scroll",
	);
	await dragCurrent();
	await page.getByRole("button", { name: "Place E2E Sender signature", exact: true }).click();
	await secondPage
		.getByRole("img", { name: "E2E Sender signature placeholder", exact: true })
		.waitFor();
	await page.getByRole("button", { name: "E2E Partner signature status", exact: true }).click();
	await page.getByRole("button", { name: "Place E2E Partner signature", exact: true }).click();
	await secondPage
		.getByRole("img", { name: "E2E Partner signature placeholder", exact: true })
		.waitFor();
	const fields = (await json(`/api/envelopes/${id}/fields`)).data;
	const senderFields = fields.filter((field) => field.recipientId === sender.id);
	assert.equal(senderFields.length, 2);
	assert.ok(
		senderFields.every((field) => field.x > 72 && field.y > 144),
		"Both dragged fields must persist their moved coordinates",
	);
	assert.deepEqual(senderFields.map((field) => field.page).sort(), [1, 2]);
	assert.equal(
		fields.filter((field) => field.recipientId === partner.id && field.page === 2).length,
		1,
	);
	await page.reload();
	await page.getByTestId("pdf-page-2").locator('canvas[data-rendered="true"]').waitFor();
	await page.getByRole("combobox", { name: "PDF page", exact: true }).selectOption("2");
	assert.equal(
		await page
			.getByTestId("pdf-page-1")
			.getByRole("img", { name: "E2E Sender signature placeholder", exact: true })
			.count(),
		1,
	);
	assert.equal(
		await page
			.getByTestId("pdf-page-2")
			.getByRole("img", { name: "E2E Sender signature placeholder", exact: true })
			.count(),
		1,
	);
	assert.deepEqual(errors, []);
	await page.screenshot({ path: `${output}/page-2.png` });
	await context.tracing.stop({ path: `${output}/trace.zip` });
	await writeFile(
		`${output}/report.json`,
		JSON.stringify(
			{
				status: "PASS",
				envelopeId: id,
				pages: 2,
				senderSignaturePages: [1, 2],
				partnerSignaturePage: 2,
				persistedAfterReload: true,
			},
			null,
			2,
		),
	);
	process.stdout.write(
		"[E2E] PASS: real two-page PDF rendered, scrolled, multiple signatures placed, and persisted after reload.\n",
	);
} finally {
	clearInterval(heartbeat);
	await browser?.close();
}
