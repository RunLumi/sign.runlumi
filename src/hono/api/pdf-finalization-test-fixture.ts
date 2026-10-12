import { PDFDocument } from "pdf-lib";
import {
	auditEvents,
	emailSendRecords,
	envelopeFields,
	envelopeRecipients,
	envelopes,
	fieldValues,
	finalDocuments,
	senderVerificationEmailRecords,
	senderVerificationTokens,
	signerTokens,
	sourceDocuments,
} from "@/db/envelope/table";

export const pdfFinalizationState = {
	envelopesTable: null as unknown,
	recipientsTable: null as unknown,
	fieldsTable: null as unknown,
	tokensTable: null as unknown,
	fieldValuesTable: null as unknown,
	auditEventsTable: null as unknown,
	sourceDocumentsTable: null as unknown,
	finalDocumentsTable: null as unknown,
	emailSendRecordsTable: null as unknown,
	senderVerificationTokensTable: null as unknown,
	senderVerificationEmailRecordsTable: null as unknown,
	envelopes: [
		{
			id: "00000000-0000-4000-8000-000000000001",
			status: "sent",
			createdBy: "sender@example.com",
			createdAt: new Date("2026-05-20T07:00:00.000Z"),
			sentBy: "sender@example.com",
			sentAt: new Date("2026-05-20T07:04:00.000Z"),
		},
	],
	recipients: [
		{
			id: "20000000-0000-4000-8000-000000000001",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			name: "Ada Lovelace",
			email: "ada@example.com",
			status: "sent",
			createdAt: new Date("2026-05-20T07:02:00.000Z"),
		},
	],
	fields: [
		{
			id: "50000000-0000-4000-8000-000000000001",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			recipientId: "20000000-0000-4000-8000-000000000001",
			type: "signature",
			page: 1,
			x: 72,
			y: 144,
			width: 180,
			height: 48,
			createdAt: new Date("2026-05-20T07:05:00.000Z"),
		},
		{
			id: "50000000-0000-4000-8000-000000000002",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			recipientId: "20000000-0000-4000-8000-000000000001",
			type: "date",
			page: 1,
			x: 300,
			y: 144,
			width: 120,
			height: 32,
			createdAt: new Date("2026-05-20T07:05:00.000Z"),
		},
	],
	tokens: [
		{
			id: "30000000-0000-4000-8000-000000000001",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			recipientId: "20000000-0000-4000-8000-000000000001",
			token: "valid-token",
			status: "active",
			expiresAt: new Date("2026-05-27T07:03:00.000Z"),
			verifiedAt: new Date("2026-05-20T07:04:00.000Z"),
			createdAt: new Date("2026-05-20T07:03:00.000Z"),
		},
	] as Array<Record<string, unknown>>,
	sourceDocuments: [
		{
			id: "10000000-0000-4000-8000-000000000001",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			r2Key: "envelopes/00000000-0000-4000-8000-000000000001/source.pdf",
			sha256: "a".repeat(64),
			byteSize: 10,
			contentType: "application/pdf",
			uploadedBy: "user_123",
			uploadedAt: new Date("2026-05-20T07:01:00.000Z"),
		},
	],
	senderVerificationTokens: [
		{
			id: "70000000-0000-4000-8000-000000000001",
			envelopeId: "00000000-0000-4000-8000-000000000001",
			name: "Sender Example",
			email: "sender@example.com",
			token: ["sender", "token"].join("-"),
			status: "verified",
			expiresAt: new Date("2026-05-20T08:30:00.000Z"),
			verifiedAt: new Date("2026-05-20T07:00:00.000Z"),
			createdAt: new Date("2026-05-20T06:59:00.000Z"),
		},
	],
	fieldValues: [] as Array<Record<string, unknown>>,
	auditEvents: [] as Array<Record<string, unknown>>,
	finalDocuments: [] as Array<Record<string, unknown>>,
	emailSendRecords: [] as Array<Record<string, unknown>>,
	senderVerificationEmailRecords: [] as Array<Record<string, unknown>>,
	r2Objects: new Map<string, Uint8Array>(),
};

function selectRows(table: unknown) {
	if (table === pdfFinalizationState.tokensTable) return pdfFinalizationState.tokens;
	if (table === pdfFinalizationState.envelopesTable) return pdfFinalizationState.envelopes;
	if (table === pdfFinalizationState.recipientsTable) return pdfFinalizationState.recipients;
	if (table === pdfFinalizationState.fieldsTable) return pdfFinalizationState.fields;
	if (table === pdfFinalizationState.fieldValuesTable) return pdfFinalizationState.fieldValues;
	if (table === pdfFinalizationState.auditEventsTable) return pdfFinalizationState.auditEvents;
	if (table === pdfFinalizationState.sourceDocumentsTable)
		return pdfFinalizationState.sourceDocuments;
	if (table === pdfFinalizationState.finalDocumentsTable)
		return pdfFinalizationState.finalDocuments;
	if (table === pdfFinalizationState.emailSendRecordsTable)
		return pdfFinalizationState.emailSendRecords;
	if (table === pdfFinalizationState.senderVerificationTokensTable)
		return pdfFinalizationState.senderVerificationTokens;
	if (table === pdfFinalizationState.senderVerificationEmailRecordsTable) {
		return pdfFinalizationState.senderVerificationEmailRecords;
	}
	return [];
}

function insertRows(table: unknown, rows: Array<Record<string, unknown>>) {
	if (table === pdfFinalizationState.fieldValuesTable)
		pdfFinalizationState.fieldValues.push(...rows);
	if (table === pdfFinalizationState.auditEventsTable)
		pdfFinalizationState.auditEvents.push(...rows);
	if (table === pdfFinalizationState.finalDocumentsTable) return insertFinalDocuments(rows);
	if (table === pdfFinalizationState.emailSendRecordsTable)
		pdfFinalizationState.emailSendRecords.push(...rows);
	if (table === pdfFinalizationState.senderVerificationEmailRecordsTable) {
		pdfFinalizationState.senderVerificationEmailRecords.push(...rows);
	}
	return rows;
}

function insertFinalDocuments(rows: Array<Record<string, unknown>>) {
	const inserted = rows.map((row, index) => ({
		id: `90000000-0000-4000-8000-${String(pdfFinalizationState.finalDocuments.length + index + 1).padStart(12, "0")}`,
		...row,
		createdAt: new Date("2026-05-20T08:01:00.000Z"),
	}));
	pdfFinalizationState.finalDocuments.push(...inserted);
	return inserted;
}

export const getPdfFinalizationTestDb = () => ({
	select: () => ({
		from: (table: unknown) => ({
			where: () => ({
				limit: async () => selectRows(table),
			}),
		}),
	}),
	insert: (table: unknown) => ({
		values: (rows: Array<Record<string, unknown>> | Record<string, unknown>) => ({
			onConflictDoNothing: () => ({
				returning: async () => insertRows(table, Array.isArray(rows) ? rows : [rows]),
			}),
			returning: async () => insertRows(table, Array.isArray(rows) ? rows : [rows]),
		}),
	}),
	update: (table: unknown) => ({
		set: (value: { status?: string }) => ({
			where: async () => {
				if (table === pdfFinalizationState.recipientsTable) {
					pdfFinalizationState.recipients[0] = {
						...pdfFinalizationState.recipients[0],
						status: value.status ?? "sent",
					};
				}
				if (table === pdfFinalizationState.envelopesTable) {
					pdfFinalizationState.envelopes[0] = {
						...pdfFinalizationState.envelopes[0],
						status: value.status ?? "sent",
					};
				}
				return [];
			},
		}),
	}),
});

export async function resetPdfFinalizationFixture() {
	pdfFinalizationState.envelopesTable = envelopes;
	pdfFinalizationState.recipientsTable = envelopeRecipients;
	pdfFinalizationState.fieldsTable = envelopeFields;
	pdfFinalizationState.tokensTable = signerTokens;
	pdfFinalizationState.fieldValuesTable = fieldValues;
	pdfFinalizationState.auditEventsTable = auditEvents;
	pdfFinalizationState.sourceDocumentsTable = sourceDocuments;
	pdfFinalizationState.finalDocumentsTable = finalDocuments;
	pdfFinalizationState.emailSendRecordsTable = emailSendRecords;
	pdfFinalizationState.senderVerificationTokensTable = senderVerificationTokens;
	pdfFinalizationState.senderVerificationEmailRecordsTable = senderVerificationEmailRecords;
	pdfFinalizationState.fieldValues.length = 0;
	pdfFinalizationState.auditEvents.length = 0;
	pdfFinalizationState.finalDocuments.length = 0;
	pdfFinalizationState.emailSendRecords.length = 0;
	pdfFinalizationState.senderVerificationEmailRecords.length = 0;
	pdfFinalizationState.r2Objects.clear();
	pdfFinalizationState.recipients.length = 1;
	pdfFinalizationState.tokens.length = 1;
	pdfFinalizationState.envelopes[0] = { ...pdfFinalizationState.envelopes[0], status: "sent" };
	pdfFinalizationState.recipients[0] = { ...pdfFinalizationState.recipients[0], status: "sent" };
	pdfFinalizationState.tokens[0] = {
		...pdfFinalizationState.tokens[0],
		expiresAt: new Date("2026-05-27T07:03:00.000Z"),
		verifiedAt: new Date("2026-05-20T07:04:00.000Z"),
	};
	pdfFinalizationState.r2Objects.set(
		String(pdfFinalizationState.sourceDocuments[0]?.r2Key),
		await createSourcePdfBytes(),
	);
}

export async function createSourcePdfBytes(): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.addPage([612, 792]);
	return pdf.save({ useObjectStreams: false });
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
