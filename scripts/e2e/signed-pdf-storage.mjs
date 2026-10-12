import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { chromium } from "playwright";

const base = process.env.LUMI_E2E_BASE_URL ?? "http://127.0.0.1:8795";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Fixtures are local only");
const output = ".wrangler/e2e/signed-pdf-storage";
await mkdir(output, { recursive: true });
const heartbeat = setInterval(
	() => process.stdout.write("[Storage E2E] Signing and verifying stored artifacts…\n"),
	10_000,
);
const browser = await chromium.launch({
	...(process.env.LUMI_E2E_BROWSER === "chromium" ? {} : { channel: "chrome" }),
	headless: true,
});
const report = [];
function hash(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}
async function json(path, options = {}) {
	const response = await fetch(base + path, options);
	if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
	return response.json();
}
async function post(path, data, headers = {}) {
	return json(path, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(data),
	});
}
try {
	for (const signingMode of ["only_me", "me_and_another_signer"]) {
		const senderName = "LÊ VIỆT HỒNG";
		const email = `storage-${crypto.randomUUID()}@example.com`;
		const start = await post(
			"/api/envelopes/sender-start",
			{ name: senderName, email, signingMode, turnstileToken: "disabled" },
			{ "x-signmos-debug": "sender-verification-link", "idempotency-key": crypto.randomUUID() },
		);
		const verifyPath = new URL(start.debug.senderVerificationUrl, base).pathname.replace(
			"/sender-verifications/",
			"/api/envelopes/sender-verifications/",
		);
		const verified = await fetch(base + verifyPath, { headers: { "x-remember-sign-in": "true" } });
		assert.equal(verified.status, 200);
		const cookie = verified.headers.get("set-cookie").split(";")[0];
		const identity = (await verified.json()).data;
		const id = identity.envelopeId;
		const senderHeaders = { "x-sender-session-token": identity.senderSessionToken };
		const source = await PDFDocument.create();
		const font = await source.embedFont(StandardFonts.Helvetica);
		for (let page = 1; page <= 2; page++)
			source.addPage([612, 792]).drawText(`Storage fixture ${signingMode}, page ${page}`, {
				x: 72,
				y: 700,
				size: 18,
				font,
			});
		const sourceBytes = Buffer.from(await source.save());
		const upload = await json(`/api/envelopes/${id}/source-pdf`, {
			method: "POST",
			headers: {
				...senderHeaders,
				"content-type": "application/pdf",
				"idempotency-key": crypto.randomUUID(),
			},
			body: sourceBytes,
		});
		let signingToken;
		if (signingMode === "only_me") {
			signingToken = upload.data.selfSign.signingUrl.split("/").at(-1);
		} else {
			const recipients = (
				await post(
					`/api/envelopes/${id}/recipients`,
					{
						recipients: [
							{ name: senderName, email },
							{ name: "Tiến Nguyễn Hữu", email: `partner-${crypto.randomUUID()}@example.com` },
						],
					},
					senderHeaders,
				)
			).data;
			await post(
				`/api/envelopes/${id}/signature-profiles`,
				{
					kind: "typed",
					typedText: senderName,
					typedFont: "serif",
					label: "Typed signature",
					selected: true,
				},
				senderHeaders,
			);
			await post(
				`/api/envelopes/${id}/fields`,
				{
					fields: recipients.flatMap((recipient) =>
						[1, 2].map((page) => ({
							recipientId: recipient.id,
							type: "signature",
							page,
							x: recipient.email === email ? 72 : 320,
							y: 200,
							width: 220,
							height: 64,
						})),
					),
				},
				senderHeaders,
			);
			const sent = await post(`/api/envelopes/${id}/actions`, { action: "send" }, senderHeaders);
			assert.equal(
				sent.data.verificationLinks.length,
				1,
				"Sender signs during preparation; only the partner receives an invitation",
			);
			const partnerVerified = await json(
				`/api/signing/verifications/${sent.data.verificationLinks[0].token}`,
			);
			signingToken = partnerVerified.data.signingLink.token;
		}
		const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		const page = await context.newPage();
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error.message));
		await page.goto(`${base}/signing/${signingToken}`);
		await page
			.getByRole("heading", { name: "Review and sign", exact: true })
			.waitFor({ timeout: 30_000 });
		await page.getByRole("button", { name: "Choose typed signature" }).click();
		await page
			.getByLabel("Typed signature text", { exact: true })
			.fill(signingMode === "only_me" ? senderName : "Tiến Nguyễn Hữu");
		await page.getByLabel("Signature font", { exact: true }).selectOption("serif");
		const completedResponse = page.waitForResponse(
			(response) =>
				response.url().endsWith(`/api/signing/${signingToken}/complete`) &&
				response.request().method() === "POST",
		);
		await page.getByRole("button", { name: "Complete signing", exact: true }).click();
		const response = await completedResponse;
		assert.equal(response.status(), 200, await response.text());
		const complete = await response.json();
		assert.equal(complete.data.envelopeStatus, "completed");
		const status = await json(`/api/envelopes/${id}/status`);
		assert.equal(status.data.finalPdfAvailable, true);
		const detail = await json(`/api/history/documents/${id}`, { headers: { cookie } });
		const download = await fetch(base + detail.data.finalPdf.downloadUrl, { headers: { cookie } });
		assert.equal(download.status, 200);
		assert.match(download.headers.get("content-disposition"), /attachment/);
		const finalBytes = Buffer.from(await download.arrayBuffer());
		const final = await PDFDocument.load(finalBytes, { updateMetadata: false });
		assert.equal(final.getPageCount(), 3, "Both original pages plus the audit page must survive");
		assert.equal(final.getProducer(), "signmos-final-pdf-renderer/5");
		assert.equal(hash(finalBytes), detail.data.finalPdf.sha256);
		assert.notEqual(hash(finalBytes), hash(sourceBytes));
		const originalDownload = await fetch(`${base}/api/envelopes/${id}/source-pdf/content`, {
			headers: senderHeaders,
		});
		assert.equal(hash(Buffer.from(await originalDownload.arrayBuffer())), hash(sourceBytes));
		await post(`/api/signing/${signingToken}/complete`, {
			signatureName: "Retry must reuse recorded signing",
		});
		const afterRetry = await fetch(base + detail.data.finalPdf.downloadUrl, {
			headers: { cookie },
		});
		assert.equal(
			hash(Buffer.from(await afterRetry.arrayBuffer())),
			hash(finalBytes),
			"Retry must reuse the stored artifact",
		);
		await page.reload();
		await page.getByRole("link", { name: "View completed document" }).waitFor();
		await page.getByRole("link", { name: "View completed document" }).click();
		await page.getByRole("link", { name: "Download final PDF" }).waitFor();
		await page.screenshot({ path: `${output}/${signingMode}-completed.png`, fullPage: true });
		assert.deepEqual(pageErrors, []);
		await writeFile(`${output}/${signingMode}.pdf`, finalBytes);
		report.push({
			signingMode,
			envelopeId: id,
			sourceKey: upload.data.r2Key,
			finalKey: `envelopes/${id}/final.pdf`,
			pages: final.getPageCount(),
			sha256: hash(finalBytes),
			sourcePreserved: true,
			retryReusedArtifact: true,
			status: "PASS",
		});
		process.stdout.write(
			`[Storage E2E] ${signingMode}: verified email → upload → signatures → separate final PDF → download → retry passed\n`,
		);
		await context.close();
	}
	await writeFile(
		`${output}/report.json`,
		JSON.stringify({ status: "PASS", documents: report }, null, 2),
	);
} finally {
	clearInterval(heartbeat);
	await browser.close();
}
