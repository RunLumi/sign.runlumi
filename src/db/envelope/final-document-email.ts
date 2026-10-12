import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/setup";
import { maxFinalDocumentEmailAttachmentBytes } from "@/lib/document-email-limits";
import { rateLimitRecords } from "./table";

export { maxFinalDocumentEmailAttachmentBytes };

const operation = "final-document-email";
const maxAttempts = 5;
const windowMs = 60 * 60 * 1000;

type EmailRateLimitRecord = {
	id: string;
	key: string;
	operation: string;
	attempts: number;
	resetAt: Date;
};

export class FinalDocumentEmailRateLimitError extends Error {
	constructor(public readonly resetAt: Date) {
		super("Signed PDF email rate limit exceeded");
		this.name = "FinalDocumentEmailRateLimitError";
	}
}

export async function claimFinalDocumentEmailSend(token: string, now: Date): Promise<void> {
	const key = `token:${await hashToken(token)}`;
	const db = getDb();
	const rows = await db
		.select()
		.from(rateLimitRecords)
		.where(and(eq(rateLimitRecords.key, key), eq(rateLimitRecords.operation, operation)))
		.limit(1);
	const record = rows.find(
		(candidate) => candidate.key === key && candidate.operation === operation,
	) as EmailRateLimitRecord | undefined;
	const resetAt = new Date(now.getTime() + windowMs);
	if (!record) {
		await db
			.insert(rateLimitRecords)
			.values({ key, operation, attempts: 1, resetAt, updatedAt: now })
			.returning();
		return;
	}

	const activeWindow = record.resetAt > now;
	if (activeWindow && record.attempts >= maxAttempts) {
		throw new FinalDocumentEmailRateLimitError(record.resetAt);
	}

	await db
		.update(rateLimitRecords)
		.set({
			attempts: activeWindow ? record.attempts + 1 : 1,
			resetAt: activeWindow ? record.resetAt : resetAt,
			updatedAt: now,
		})
		.where(eq(rateLimitRecords.id, record.id));
}

async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
