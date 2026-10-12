import { PDFDocument } from "pdf-lib";
import {
	auditEvents,
	envelopeFields,
	envelopeRecipients,
	envelopes,
	fieldValues,
	finalDocuments,
	rateLimitRecords,
	signerTokens,
} from "@/db/envelope";
import { FINAL_PDF_RENDERER_PRODUCER } from "@/db/envelope/final-pdf-renderer";
import { historySecurityEventTypes } from "@/db/history-access/security-audit";
import { apiHono } from "@/hono/api";
import { maxFinalDocumentEmailAttachmentBytes } from "@/lib/document-email-limits";

const envelopeId = "00000000-0000-4000-8000-000000000001";
const senderRecipientId = "20000000-0000-4000-8000-000000000001";
const partnerRecipientId = "20000000-0000-4000-8000-000000000002";
const finalDocumentToken = "90000000-0000-4000-8000-000000000001";
const finalR2Key = `envelopes/${envelopeId}/final.pdf`;

const state = vi.hoisted(() => ({
	envelopesTable: null as unknown,
	recipientsTable: null as unknown,
	fieldsTable: null as unknown,
	fieldValuesTable: null as unknown,
	auditEventsTable: null as unknown,
	finalDocumentsTable: null as unknown,
	tokensTable: null as unknown,
	rateLimitTable: null as unknown,
	envelopes: [] as Array<Record<string, unknown>>,
	recipients: [] as Array<Record<string, unknown>>,
	fields: [] as Array<Record<string, unknown>>,
	fieldValues: [] as Array<Record<string, unknown>>,
	auditEvents: [] as Array<Record<string, unknown>>,
	finalDocuments: [] as Array<Record<string, unknown>>,
	tokens: [] as Array<Record<string, unknown>>,
	rateLimits: [] as Array<Record<string, unknown>>,
	r2Objects: new Map<string, Uint8Array>(),
}));

function selectRows(table: unknown) {
	if (table === state.envelopesTable) return state.envelopes;
	if (table === state.recipientsTable) return state.recipients;
	if (table === state.fieldsTable) return state.fields;
	if (table === state.fieldValuesTable) return state.fieldValues;
	if (table === state.auditEventsTable) return state.auditEvents;
	if (table === state.finalDocumentsTable) return state.finalDocuments;
	if (table === state.tokensTable) return state.tokens;
	if (table === state.rateLimitTable) return state.rateLimits;
	return [];
}

vi.mock("@/db/setup", () => ({
	getDb: () => ({
		select: () => ({
			from: (table: unknown) => ({
				where: () => ({
					limit: async () => selectRows(table),
				}),
			}),
		}),
		insert: (table: unknown) => ({
			values: (value: Record<string, unknown>) => ({
				returning: async () => {
					if (table !== state.rateLimitTable) return [];
					const record = { id: `rate-${state.rateLimits.length + 1}`, ...value };
					state.rateLimits.push(record);
					return [record];
				},
			}),
		}),
		update: (table: unknown) => ({
			set: (value: Record<string, unknown>) => ({
				where: async () => {
					if (table === state.rateLimitTable && state.rateLimits[0]) {
						Object.assign(state.rateLimits[0], value);
					}
				},
			}),
		}),
	}),
}));

describe("completed document access", () => {
	beforeEach(() => {
		state.envelopesTable = envelopes;
		state.recipientsTable = envelopeRecipients;
		state.fieldsTable = envelopeFields;
		state.fieldValuesTable = fieldValues;
		state.auditEventsTable = auditEvents;
		state.finalDocumentsTable = finalDocuments;
		state.tokensTable = signerTokens;
		state.rateLimitTable = rateLimitRecords;
		state.envelopes = [
			{
				id: envelopeId,
				status: "completed",
				createdBy: "sender@example.com",
				createdAt: new Date("2026-05-20T07:00:00.000Z"),
				sentBy: "sender@example.com",
				sentAt: new Date("2026-05-20T07:04:00.000Z"),
			},
		];
		state.recipients = [
			{
				id: senderRecipientId,
				envelopeId,
				name: "Sender Example",
				email: "sender@example.com",
				status: "completed",
				createdAt: new Date("2026-05-20T07:01:00.000Z"),
			},
			{
				id: partnerRecipientId,
				envelopeId,
				name: "Ada Lovelace",
				email: "ada@example.com",
				status: "completed",
				createdAt: new Date("2026-05-20T07:02:00.000Z"),
			},
		];
		state.fields = [
			{
				id: "50000000-0000-4000-8000-000000000001",
				envelopeId,
				recipientId: senderRecipientId,
				type: "date",
				page: 1,
				x: 300,
				y: 144,
				width: 120,
				height: 32,
				createdAt: new Date("2026-05-20T07:05:00.000Z"),
			},
			{
				id: "50000000-0000-4000-8000-000000000002",
				envelopeId,
				recipientId: partnerRecipientId,
				type: "date",
				page: 1,
				x: 300,
				y: 244,
				width: 120,
				height: 32,
				createdAt: new Date("2026-05-20T07:05:00.000Z"),
			},
		];
		state.fieldValues = [
			{
				id: "80000000-0000-4000-8000-000000000001",
				envelopeId,
				recipientId: senderRecipientId,
				fieldId: "50000000-0000-4000-8000-000000000001",
				value: "2026-05-20",
				completedAt: new Date("2026-05-20T07:06:00.000Z"),
			},
			{
				id: "80000000-0000-4000-8000-000000000002",
				envelopeId,
				recipientId: partnerRecipientId,
				fieldId: "50000000-0000-4000-8000-000000000002",
				value: "2026-05-21",
				completedAt: new Date("2026-05-21T09:10:00.000Z"),
			},
		];
		state.auditEvents = [
			{
				id: "a1",
				envelopeId,
				recipientId: null,
				eventType: "envelope.sent",
				message: "sender@example.com",
				createdAt: new Date("2026-05-20T07:04:00.000Z"),
			},
			{
				id: "a2",
				envelopeId,
				recipientId: partnerRecipientId,
				eventType: "partner.verified",
				message: "ada@example.com",
				createdAt: new Date("2026-05-20T07:30:00.000Z"),
			},
			{
				id: "a3",
				envelopeId,
				recipientId: partnerRecipientId,
				eventType: "partner.signing.viewed",
				message: null,
				createdAt: new Date("2026-05-21T09:00:00.000Z"),
			},
			{
				id: "a4",
				envelopeId,
				recipientId: partnerRecipientId,
				eventType: "field.value.completed",
				message: "Ada Lovelace",
				createdAt: new Date("2026-05-21T09:10:00.000Z"),
			},
			{
				id: "a5",
				envelopeId,
				recipientId: partnerRecipientId,
				eventType: "recipient.completed",
				message: "Ada Lovelace",
				createdAt: new Date("2026-05-21T09:10:00.000Z"),
			},
			{
				id: "a6",
				envelopeId,
				recipientId: partnerRecipientId,
				eventType: "partner.link.expired",
				message: "ada@example.com",
				createdAt: new Date("2026-05-30T00:00:00.000Z"),
			},
		];
		const finalPdf = new TextEncoder().encode("%PDF-1.4\ncompleted artifact\n%%EOF");
		state.finalDocuments = [
			{
				id: finalDocumentToken,
				envelopeId,
				r2Key: finalR2Key,
				sha256: "b".repeat(64),
				byteSize: finalPdf.byteLength,
				contentType: "application/pdf",
				createdAt: new Date("2026-05-21T09:11:00.000Z"),
			},
		];
		state.tokens = [
			{
				id: "30000000-0000-4000-8000-000000000001",
				envelopeId,
				recipientId: partnerRecipientId,
				token: "valid-token",
				status: "active",
				expiresAt: new Date("2026-05-22T07:03:00.000Z"),
				verifiedAt: null,
				createdAt: new Date("2026-05-20T07:03:00.000Z"),
			},
		];
		state.rateLimits.length = 0;
		state.r2Objects.clear();
		state.r2Objects.set(finalR2Key, finalPdf);
	});

	it("returns completed view data with download, parties, signed dates, status, and public history", async () => {
		// #27 assumptions before RED:
		// - The final document id is the bearer final-download token.
		// - The completed-document API returns the UI contract instead of raw audit rows.
		// - Security/verification and field-level technical audit rows are filtered from normal history.
		const response = await apiHono.request(`/api/final-documents/${finalDocumentToken}`);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			data: {
				status: string;
				finalPdf: { downloadUrl: string };
				parties: Array<{ name: string; email: string; signedDate: string | null }>;
				history: Array<{ type: string; title: string; occurredAt: string }>;
			};
		};
		expect(body.data.status).toBe("completed");
		expect(body.data.finalPdf.downloadUrl).toBe(`/api/final-documents/${finalDocumentToken}/pdf`);
		expect(body.data.parties).toEqual([
			expect.objectContaining({
				name: "Sender Example",
				email: "sender@example.com",
				signedDate: "2026-05-20",
			}),
			expect.objectContaining({
				name: "Ada Lovelace",
				email: "ada@example.com",
				signedDate: "2026-05-21",
			}),
		]);
		expect(body.data.history).toEqual([
			expect.objectContaining({ type: "sent", title: "Envelope sent" }),
			expect.objectContaining({ type: "viewed", title: "Ada Lovelace viewed the document" }),
			expect.objectContaining({ type: "signed", title: "Ada Lovelace signed" }),
		]);
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain("partner.verified");
		expect(serialized).not.toContain("field.value.completed");
		expect(serialized).not.toContain("partner.link.expired");
	});

	it("filters every My documents technical event while retaining normal lifecycle history", async () => {
		state.auditEvents.push(
			...historySecurityEventTypes.map((eventType, index) => ({
				id: `history-${index}`,
				envelopeId,
				recipientId: null,
				eventType,
				message: "safe-reference",
				createdAt: new Date(`2026-05-21T10:${String(index).padStart(2, "0")}:00.000Z`),
			})),
		);

		const response = await apiHono.request(`/api/final-documents/${finalDocumentToken}`);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { data: { history: Array<{ type: string }> } };
		expect(body.data.history.map((event) => event.type)).toEqual(["sent", "viewed", "signed"]);
		expect(JSON.stringify(body)).not.toContain("history.");
	});

	it("downloads the final PDF with only the final document token", async () => {
		const bucket = {
			get: async (key: string) => ({
				arrayBuffer: async () => state.r2Objects.get(key)?.buffer,
			}),
		};

		const response = await apiHono.request(
			`/api/final-documents/${finalDocumentToken}/pdf`,
			undefined,
			{ DOCUMENTS_BUCKET: bucket },
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("application/pdf");
		expect(response.headers.get("content-disposition")).toBe(
			`attachment; filename="lumi-sign-${envelopeId}.pdf"`,
		);
		expect(new TextDecoder().decode(await response.arrayBuffer())).toContain("completed artifact");
	});

	it("sends a validated signed PDF as a Cloudflare Email Service attachment", async () => {
		const pdf = await createCurrentFinalPdf();
		state.r2Objects.set(finalR2Key, pdf);
		const send = vi.fn().mockResolvedValue({ messageId: "email-message-1" });
		const bucket = createBucket();
		const response = await apiHono.request(
			`/api/final-documents/${finalDocumentToken}/email`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "backup@example.com" }),
			},
			{
				DOCUMENTS_BUCKET: bucket,
				EMAIL: { send },
				EMAIL_FROM: "Lumi Sign <sign@runlumi.app>",
				EMAIL_REPLY_TO: "sign@runlumi.app",
			},
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ data: { sent: true } });
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "backup@example.com",
				from: "Lumi Sign <sign@runlumi.app>",
				replyTo: "sign@runlumi.app",
				subject: "Your signed document from Lumi Sign",
				attachments: [
					expect.objectContaining({
						filename: `lumi-sign-${envelopeId}.pdf`,
						type: "application/pdf",
						disposition: "attachment",
						content: expect.any(Uint8Array),
					}),
				],
			}),
		);
		expect(state.rateLimits).toHaveLength(1);
		expect(state.rateLimits[0]?.key).not.toBe(finalDocumentToken);
	});

	it("rejects an invalid destination email before resolving the document", async () => {
		const response = await apiHono.request(`/api/final-documents/${finalDocumentToken}/email`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "not-an-email" }),
		});

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: { code: "INVALID_EMAIL", message: "Enter a valid email address" },
		});
		expect(state.rateLimits).toHaveLength(0);
	});

	it("returns a recoverable delivery error when Cloudflare Email Service rejects the send", async () => {
		state.r2Objects.set(finalR2Key, await createCurrentFinalPdf());
		const send = vi.fn().mockRejectedValue(new Error("synthetic provider failure"));
		const response = await apiHono.request(
			`/api/final-documents/${finalDocumentToken}/email`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "backup@example.com" }),
			},
			{
				DOCUMENTS_BUCKET: createBucket(),
				EMAIL: { send },
				EMAIL_FROM: "Lumi Sign <sign@runlumi.app>",
			},
		);

		expect(response.status).toBe(502);
		await expect(response.json()).resolves.toEqual({
			error: {
				code: "EMAIL_DELIVERY_FAILED",
				message: "The email could not be sent. You can still download the signed PDF.",
			},
		});
	});

	it("limits signed PDF email sends to five per document token per hour", async () => {
		state.r2Objects.set(finalR2Key, await createCurrentFinalPdf());
		const send = vi.fn().mockResolvedValue({ messageId: "email-message-1" });
		const bucket = createBucket();
		const environment = {
			DOCUMENTS_BUCKET: bucket,
			EMAIL: { send },
			EMAIL_FROM: "Lumi Sign <sign@runlumi.app>",
		};
		const request = () =>
			apiHono.request(
				`/api/final-documents/${finalDocumentToken}/email`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ email: "backup@example.com" }),
				},
				environment,
			);

		for (let attempt = 0; attempt < 5; attempt += 1) {
			expect((await request()).status).toBe(200);
		}
		expect((await request()).status).toBe(429);
		expect(send).toHaveBeenCalledTimes(5);
	});

	it("rejects an attachment above the safe email size before sending", async () => {
		state.r2Objects.set(finalR2Key, await createLargeCurrentFinalPdf());
		const send = vi.fn().mockResolvedValue({ messageId: "email-message-1" });
		const response = await apiHono.request(
			`/api/final-documents/${finalDocumentToken}/email`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "backup@example.com" }),
			},
			{
				DOCUMENTS_BUCKET: createBucket(),
				EMAIL: { send },
				EMAIL_FROM: "Lumi Sign <sign@runlumi.app>",
			},
		);

		expect(response.status).toBe(413);
		await expect(response.json()).resolves.toEqual({
			error: {
				code: "EMAIL_ATTACHMENT_TOO_LARGE",
				message: "This PDF is too large to email as an attachment. Download it instead.",
				maxBytes: maxFinalDocumentEmailAttachmentBytes,
			},
		});
		expect(send).not.toHaveBeenCalled();
	});

	it("routes a completed signing link to the completed-document view without signer verification", async () => {
		const response = await apiHono.request("/api/signing/valid-token", {
			headers: { "x-now": "2026-05-21T09:12:00.000Z" },
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			data: {
				completedDocument: {
					url: "/completed-documents/valid-token",
					downloadUrl: "/api/final-documents/valid-token/pdf",
				},
			},
		});
	});
});

async function createCurrentFinalPdf(): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.setProducer(FINAL_PDF_RENDERER_PRODUCER);
	pdf.addPage();
	return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}

async function createLargeCurrentFinalPdf(): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.setProducer(FINAL_PDF_RENDERER_PRODUCER);
	pdf.context.register(
		pdf.context.stream(new Uint8Array(maxFinalDocumentEmailAttachmentBytes + 1)),
	);
	pdf.addPage();
	const bytes = new Uint8Array(await pdf.save({ useObjectStreams: false }));
	if (bytes.byteLength <= maxFinalDocumentEmailAttachmentBytes) {
		throw new Error("Generated test PDF must exceed the attachment limit");
	}
	return bytes;
}

function createBucket() {
	return {
		get: async (key: string) => {
			const bytes = state.r2Objects.get(key);
			return bytes ? { arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer } : null;
		},
	};
}
