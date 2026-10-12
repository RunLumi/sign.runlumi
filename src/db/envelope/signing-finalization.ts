import { eq } from "drizzle-orm";
import { getDb } from "@/db/setup";
import { finalizeCompletedEnvelope } from "./finalization";
import type { CompleteSigningResult, Recipient, SignerToken } from "./schema";
import { envelopes } from "./table";

export class SignedPdfPreparationError extends Error {
	constructor() {
		super("Your signature is saved, but the final PDF could not be stored. Try again.");
		this.name = "SignedPdfPreparationError";
	}
}

export async function storeFinalPdfThenComplete(
	envelopeId: string,
	bucket?: R2Bucket,
): Promise<void> {
	try {
		const document = await finalizeCompletedEnvelope(envelopeId, { documentsBucket: bucket });
		if (!document) throw new SignedPdfPreparationError();
		await getDb()
			.update(envelopes)
			.set({ status: "completed" })
			.where(eq(envelopes.id, envelopeId));
	} catch {
		throw new SignedPdfPreparationError();
	}
}

export async function resumeRecordedSigning(
	token: SignerToken,
	recipients: Recipient[],
	bucket?: R2Bucket,
): Promise<CompleteSigningResult> {
	const allSigned =
		recipients.length > 0 && recipients.every((recipient) => recipient.status === "completed");
	if (allSigned) await storeFinalPdfThenComplete(token.envelopeId, bucket);
	return {
		envelopeId: token.envelopeId,
		recipientId: token.recipientId,
		recipientStatus: "completed",
		envelopeStatus: allSigned ? "completed" : "sent",
	};
}
