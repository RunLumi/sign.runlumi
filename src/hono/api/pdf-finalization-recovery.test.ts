import { recoverSignedFinalDocument } from "@/db/envelope";
import { apiHono } from "@/hono/api";
import {
	resetPdfFinalizationFixture,
	pdfFinalizationState as state,
	toArrayBuffer,
} from "./pdf-finalization-test-fixture";

vi.mock("@/db/setup", async () => {
	const { getPdfFinalizationTestDb } = await import("./pdf-finalization-test-fixture");
	return { getDb: getPdfFinalizationTestDb };
});

describe("PDF finalization recovery", () => {
	beforeEach(resetPdfFinalizationFixture);
	it("keeps failed R2 finalization retryable and never duplicates saved signatures", async () => {
		const sourceKey = String(state.sourceDocuments[0]?.r2Key);
		const original = new Uint8Array(state.r2Objects.get(sourceKey) ?? []);
		let fail = true;
		const bucket = {
			get: async (key: string) => {
				const bytes = state.r2Objects.get(key);
				return bytes ? { arrayBuffer: async () => toArrayBuffer(bytes) } : null;
			},
			put: async (key: string, value: Uint8Array) => {
				if (fail) throw new Error("R2 unavailable");
				state.r2Objects.set(key, new Uint8Array(value));
				return null;
			},
		};
		const complete = () =>
			apiHono.request(
				"/api/signing/valid-token/complete",
				{
					method: "POST",
					headers: { "content-type": "application/json", "x-now": "2026-05-20T08:00:00.000Z" },
					body: JSON.stringify({ signatureName: "LÊ VIỆT HỒNG" }),
				},
				{ DOCUMENTS_BUCKET: bucket },
			);
		const failed = await complete();
		expect(failed.status).toBe(503);
		expect(await failed.json()).toEqual({
			error: expect.objectContaining({ code: "FINAL_PDF_PREPARATION_FAILED", retryable: true }),
		});
		expect(state.envelopes[0]?.status).toBe("sent");
		expect(state.recipients[0]?.status).toBe("completed");
		expect(state.finalDocuments).toHaveLength(0);
		expect(state.fieldValues).toHaveLength(2);
		fail = false;
		expect((await complete()).status).toBe(200);
		expect(state.envelopes[0]?.status).toBe("completed");
		expect(state.finalDocuments).toHaveLength(1);
		expect(state.fieldValues).toHaveLength(2);
		const finalKey = String(state.finalDocuments[0]?.r2Key);
		expect(finalKey).not.toBe(sourceKey);
		expect(state.r2Objects.get(sourceKey)).toEqual(original);
		const stored = state.r2Objects.get(finalKey);
		expect(stored).toBeTruthy();
		expect(state.finalDocuments[0]?.byteSize).toBe(stored?.byteLength);
		expect((await complete()).status).toBe(200);
		expect(state.finalDocuments).toHaveLength(1);
		expect(state.fieldValues).toHaveLength(2);
	});

	it("recovers an older completed envelope with no final PDF from its recorded signatures", async () => {
		state.envelopes[0] = { ...state.envelopes[0], status: "completed" };
		state.recipients[0] = { ...state.recipients[0], status: "completed" };
		state.fieldValues.push(
			...state.fields.map((field) => ({
				fieldId: field.id,
				recipientId: field.recipientId,
				envelopeId: field.envelopeId,
				value: field.type === "signature" ? "Tiến Nguyễn Hữu" : "2026-05-20",
			})),
		);
		const bucket = {
			get: async (key: string) => {
				const bytes = state.r2Objects.get(key);
				return bytes ? { arrayBuffer: async () => toArrayBuffer(bytes) } : null;
			},
			put: async (key: string, value: Uint8Array) => {
				state.r2Objects.set(key, new Uint8Array(value));
				return null;
			},
		} as unknown as R2Bucket;
		const recovered = await recoverSignedFinalDocument(String(state.envelopes[0]?.id), bucket);
		expect(recovered?.r2Key).toBe("envelopes/00000000-0000-4000-8000-000000000001/final.pdf");
		expect(state.r2Objects.size).toBe(2);
		expect(state.finalDocuments).toHaveLength(1);
		const again = await recoverSignedFinalDocument(String(state.envelopes[0]?.id), bucket);
		expect(again?.id).toBe(recovered?.id);
		expect(state.finalDocuments).toHaveLength(1);
	});

	it("does not recover an artifact while signatures are missing or the envelope is deleted", async () => {
		const bucket = { get: vi.fn(), put: vi.fn() } as unknown as R2Bucket;
		expect(await recoverSignedFinalDocument(String(state.envelopes[0]?.id), bucket)).toBeNull();
		state.recipients[0] = { ...state.recipients[0], status: "completed" };
		expect(await recoverSignedFinalDocument(String(state.envelopes[0]?.id), bucket)).toBeNull();
		state.envelopes[0] = { ...state.envelopes[0], status: "deleted" };
		expect(await recoverSignedFinalDocument(String(state.envelopes[0]?.id), bucket)).toBeNull();
		expect(bucket.put).not.toHaveBeenCalled();
	});
});
