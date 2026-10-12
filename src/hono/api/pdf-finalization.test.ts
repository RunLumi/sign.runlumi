import { PDFDocument } from "pdf-lib";
import { FINAL_PDF_RENDERER_PRODUCER } from "@/db/envelope/final-pdf-renderer";
import { apiHono } from "@/hono/api";
import {
	createSourcePdfBytes,
	resetPdfFinalizationFixture,
	pdfFinalizationState as state,
	toArrayBuffer,
} from "./pdf-finalization-test-fixture";

vi.mock("@/db/setup", async () => {
	const { getPdfFinalizationTestDb } = await import("./pdf-finalization-test-fixture");
	return { getDb: getPdfFinalizationTestDb };
});

describe("PDF finalization", () => {
	beforeEach(resetPdfFinalizationFixture);
	it("keeps the envelope sent until every required recipient completes", async () => {
		state.recipients.push({
			id: "20000000-0000-4000-8000-000000000002",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			name: "Grace Hopper",
			email: "grace@example.com",
			status: "sent",
			createdAt: new Date("2026-05-20T07:02:30.000Z"),
		});
		const bucket = {
			get: async (key: string) => {
				const bytes = state.r2Objects.get(key);
				return bytes ? { arrayBuffer: async () => toArrayBuffer(bytes) } : null;
			},
			put: async (key: string, value: ArrayBuffer | ArrayBufferView) => {
				const bytes =
					value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer);
				state.r2Objects.set(key, bytes);
				return null;
			},
		};

		const response = await apiHono.request(
			"/api/signing/valid-token/complete",
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-now": "2026-05-20T08:00:00.000Z",
				},
				body: JSON.stringify({ signatureName: "Ada Lovelace", date: "2026-05-20" }),
			},
			{ DOCUMENTS_BUCKET: bucket },
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			data: expect.objectContaining({
				envelopeStatus: "sent",
				recipientStatus: "completed",
			}),
		});
		expect(state.envelopes[0]?.status).toBe("sent");
		expect(state.finalDocuments).toHaveLength(0);
		expect(state.emailSendRecords).toEqual([
			expect.objectContaining({
				email: "sender@example.com",
				kind: "partner_signed",
				fallbackUrl: "/envelope-fields?envelopeId=00000000-0000-4000-8000-000000000001",
			}),
		]);
		expect(state.senderVerificationEmailRecords).toHaveLength(0);
		expect(state.r2Objects.size).toBe(1);
	});

	it("generates a final PDF with flattened values and audit summary when all recipients complete", async () => {
		// #19 assumptions before RED:
		// - Completion notifications are persisted as send records, not real Resend calls.
		// - Sender completion fallback uses the verified sender process token.
		// - Partner completion fallback uses the verified signing process token.
		// - The certificate checksum is a deterministic hash over signing inputs, not a self-hash.
		const bucket = {
			get: async (key: string) => {
				const bytes = state.r2Objects.get(key);
				return bytes ? { arrayBuffer: async () => toArrayBuffer(bytes) } : null;
			},
			put: async (key: string, value: ArrayBuffer | ArrayBufferView) => {
				const bytes =
					value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer);
				state.r2Objects.set(key, bytes);
				return null;
			},
		};

		const response = await apiHono.request(
			"/api/signing/valid-token/complete",
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-now": "2026-05-20T08:00:00.000Z",
				},
				body: JSON.stringify({ signatureName: "Ada Lovelace", date: "2026-05-20" }),
			},
			{ DOCUMENTS_BUCKET: bucket },
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			data: expect.objectContaining({
				envelopeId: "00000000-0000-4000-8000-000000000001",
				envelopeStatus: "completed",
			}),
		});
		expect(state.finalDocuments).toHaveLength(1);
		const finalKey = state.finalDocuments[0]?.r2Key as string;
		const finalPdfBytes = state.r2Objects.get(finalKey);
		if (!finalPdfBytes) throw new Error("Final PDF was not written");
		const finalPdf = new TextDecoder().decode(finalPdfBytes);
		const parsedFinalPdf = await PDFDocument.load(finalPdfBytes);
		expect(parsedFinalPdf.getPageCount()).toBe(2);
		expect(finalPdf.slice(0, 5)).toBe("%PDF-");
		expect(state.fieldValues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ value: "Ada Lovelace" }),
				expect.objectContaining({ value: "2026-05-20" }),
			]),
		);
		expect(state.auditEvents).toEqual(
			expect.arrayContaining([expect.objectContaining({ eventType: "recipient.completed" })]),
		);
		expect(state.emailSendRecords).toEqual([
			expect.objectContaining({
				email: "sender@example.com",
				kind: "partner_signed",
				fallbackUrl: "/envelope-fields?envelopeId=00000000-0000-4000-8000-000000000001",
			}),
			expect.objectContaining({
				email: "ada@example.com",
				kind: "completion",
				fallbackUrl: "/completed-documents/valid-token",
			}),
		]);
		expect(state.senderVerificationEmailRecords).toEqual([
			expect.objectContaining({
				email: "sender@example.com",
				kind: "completion",
				fallbackUrl: "/completed-documents/90000000-0000-4000-8000-000000000001",
			}),
		]);
		for (const record of [...state.emailSendRecords, ...state.senderVerificationEmailRecords]) {
			expect(record).not.toHaveProperty("attachment");
			expect(record).not.toHaveProperty("pdfAttachment");
		}
	});

	it("reports final PDF availability and repairs stale downloads through process links", async () => {
		const finalPdf = await createSourcePdfBytes();
		const r2Key = "envelopes/00000000-0000-4000-8000-000000000001/final.pdf";
		state.finalDocuments.push({
			id: "90000000-0000-4000-8000-000000000001",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			r2Key,
			sha256: "b".repeat(64),
			byteSize: finalPdf.byteLength,
			contentType: "application/pdf",
			createdAt: new Date("2026-05-20T08:01:00.000Z"),
		});
		state.envelopes[0] = { ...state.envelopes[0], status: "completed" };
		state.r2Objects.set(r2Key, finalPdf);
		const bucket = {
			get: async (key: string) => {
				const bytes = state.r2Objects.get(key);
				return bytes ? { arrayBuffer: async () => toArrayBuffer(bytes) } : null;
			},
			put: async (key: string, value: ArrayBuffer | ArrayBufferView) => {
				const bytes =
					value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer);
				state.r2Objects.set(key, bytes);
				return null;
			},
		};

		const statusResponse = await apiHono.request(
			"/api/envelopes/00000000-0000-4000-8000-000000000001/status",
		);

		expect(statusResponse.status).toBe(200);
		await expect(statusResponse.json()).resolves.toEqual({
			data: {
				envelopeId: "00000000-0000-4000-8000-000000000001",
				status: "completed",
				finalPdfAvailable: true,
				allowedActions: ["download_final_pdf", "delete"],
				pendingRecipients: [],
			},
		});

		const finalTokenDownload = await apiHono.request(
			"/api/final-documents/90000000-0000-4000-8000-000000000001/pdf",
			undefined,
			{ DOCUMENTS_BUCKET: bucket },
		);
		expect(finalTokenDownload.status).toBe(200);
		expect(finalTokenDownload.headers.get("content-type")).toBe("application/pdf");
		const tokenPdf = await PDFDocument.load(await finalTokenDownload.arrayBuffer(), {
			updateMetadata: false,
		});
		expect(tokenPdf.getProducer()).toBe(FINAL_PDF_RENDERER_PRODUCER);
		const storedPdf = await PDFDocument.load(state.r2Objects.get(r2Key) ?? new Uint8Array(), {
			updateMetadata: false,
		});
		expect(storedPdf.getProducer()).toBe(FINAL_PDF_RENDERER_PRODUCER);

		const senderDownload = await apiHono.request(
			"/api/envelopes/00000000-0000-4000-8000-000000000001/final-pdf?senderSessionToken=sender-token",
			{ headers: { "x-now": "2026-05-20T08:00:00.000Z" } },
			{ DOCUMENTS_BUCKET: bucket },
		);
		expect(senderDownload.status).toBe(200);
		expect(senderDownload.headers.get("content-type")).toBe("application/pdf");
		expect(PDFDocument.load(await senderDownload.arrayBuffer())).resolves.toBeTruthy();

		const signerDownload = await apiHono.request(
			"/api/signing/valid-token/final-pdf",
			{ headers: { "x-now": "2026-05-20T08:00:00.000Z" } },
			{ DOCUMENTS_BUCKET: bucket },
		);
		expect(signerDownload.status).toBe(200);
		expect(signerDownload.headers.get("content-type")).toBe("application/pdf");
		expect(PDFDocument.load(await signerDownload.arrayBuffer())).resolves.toBeTruthy();
	});

	it("blocks unverified, expired, and deleted final PDF access", async () => {
		const finalPdf = new TextEncoder().encode("%PDF-1.4\ncompleted artifact\n%%EOF");
		const r2Key = "envelopes/00000000-0000-4000-8000-000000000001/final.pdf";
		state.finalDocuments.push({
			id: "90000000-0000-4000-8000-000000000001",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			r2Key,
			sha256: "b".repeat(64),
			byteSize: finalPdf.byteLength,
			contentType: "application/pdf",
			createdAt: new Date("2026-05-20T08:01:00.000Z"),
		});
		state.envelopes[0] = { ...state.envelopes[0], status: "completed" };
		state.r2Objects.set(r2Key, finalPdf);
		const bucket = {
			get: async (key: string) => ({
				arrayBuffer: async () => state.r2Objects.get(key)?.buffer,
			}),
		};

		state.tokens[0] = { ...state.tokens[0], verifiedAt: null };
		const unverified = await apiHono.request(
			"/api/signing/valid-token/final-pdf",
			{ headers: { "x-now": "2026-05-20T08:00:00.000Z" } },
			{ DOCUMENTS_BUCKET: bucket },
		);
		expect(unverified.status).toBe(403);

		state.tokens[0] = {
			...state.tokens[0],
			verifiedAt: new Date("2026-05-20T07:04:00.000Z"),
			expiresAt: new Date("2026-05-20T07:30:00.000Z"),
		};
		const expired = await apiHono.request(
			"/api/signing/valid-token/final-pdf",
			{ headers: { "x-now": "2026-05-20T08:00:00.000Z" } },
			{ DOCUMENTS_BUCKET: bucket },
		);
		expect(expired.status).toBe(410);

		state.tokens[0] = {
			...state.tokens[0],
			expiresAt: new Date("2026-05-27T07:03:00.000Z"),
		};
		state.envelopes[0] = { ...state.envelopes[0], status: "deleted" };
		const deleted = await apiHono.request(
			"/api/envelopes/00000000-0000-4000-8000-000000000001/final-pdf?senderSessionToken=sender-token",
			{ headers: { "x-now": "2026-05-20T08:00:00.000Z" } },
			{ DOCUMENTS_BUCKET: bucket },
		);
		expect(deleted.status).toBe(404);
	});
});
