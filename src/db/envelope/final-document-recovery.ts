import { eq } from "drizzle-orm";
import { getDb } from "@/db/setup";
import { finalizeCompletedEnvelope, regenerateFinalDocumentArtifact } from "./finalization";
import { EnvelopeSchema, type FinalDocument, FinalDocumentSchema, RecipientSchema } from "./schema";
import {
	envelopeFields,
	envelopeRecipients,
	envelopes,
	fieldValues,
	finalDocuments,
} from "./table";

/** Recovery only uses existing signing evidence; it never records a new signature. */
export async function recoverSignedFinalDocument(
	envelopeId: string,
	bucket: R2Bucket,
): Promise<FinalDocument | null> {
	const db = getDb();
	const [row] = await db.select().from(envelopes).where(eq(envelopes.id, envelopeId)).limit(1);
	const envelope = row ? EnvelopeSchema.parse(row) : null;
	if (!envelope || (envelope.status !== "completed" && envelope.status !== "sent")) return null;
	const recipients = (
		await db
			.select()
			.from(envelopeRecipients)
			.where(eq(envelopeRecipients.envelopeId, envelopeId))
			.limit(100)
	).map((recipient) => RecipientSchema.parse(recipient));
	if (recipients.length === 0 || recipients.some((recipient) => recipient.status !== "completed"))
		return null;
	const fields = await db
		.select()
		.from(envelopeFields)
		.where(eq(envelopeFields.envelopeId, envelopeId))
		.limit(100);
	const values = await db
		.select()
		.from(fieldValues)
		.where(eq(fieldValues.envelopeId, envelopeId))
		.limit(100);
	if (
		fields.length === 0 ||
		fields.some(
			(field) =>
				!values.some(
					(value) =>
						value.fieldId === field.id &&
						value.recipientId === field.recipientId &&
						value.value.trim(),
				),
		)
	)
		return null;
	const [record] = await db
		.select()
		.from(finalDocuments)
		.where(eq(finalDocuments.envelopeId, envelopeId))
		.limit(1);
	let document = record ? FinalDocumentSchema.parse(record) : null;
	if (document) {
		if (!(await bucket.get(document.r2Key)))
			document =
				(await regenerateFinalDocumentArtifact(document, { documentsBucket: bucket }))?.document ??
				null;
	} else {
		document = await finalizeCompletedEnvelope(envelopeId, { documentsBucket: bucket });
	}
	if (envelope.status !== "completed")
		await db.update(envelopes).set({ status: "completed" }).where(eq(envelopes.id, envelopeId));
	return document;
}
