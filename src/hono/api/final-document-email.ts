import type { Context } from "hono";
import { z } from "zod";
import {
	claimFinalDocumentEmailSend,
	deliverSignedPdfBackupEmail,
	type EmailDeliveryEnv,
	EmailDeliveryError,
	type FinalDocument,
	FinalDocumentEmailRateLimitError,
	getFinalDocumentByToken,
	regenerateFinalDocumentArtifact,
} from "@/db/envelope";
import { isCurrentFinalPdfArtifact } from "@/db/envelope/final-pdf-renderer";
import { createHono } from "@/hono/factory";
import { maxFinalDocumentEmailAttachmentBytes } from "@/lib/document-email-limits";

const finalDocumentEmailEndpoint = createHono();
const requestSchema = z.object({ email: z.string().trim().max(254).email() });
type RequestContext = Context<{ Bindings: Env }>;
type EmailEnvironment = Env &
	EmailDeliveryEnv & {
		EMAIL: SendEmail;
		EMAIL_FROM: string;
		DOCUMENTS_BUCKET?: R2Bucket;
	};
type PreparedPdf = {
	document: FinalDocument;
	bytes: Uint8Array;
	env: EmailEnvironment;
};

finalDocumentEmailEndpoint.post("/:token/email", async (c) => {
	const parsed = requestSchema.safeParse(await c.req.json().catch(() => null));
	if (!parsed.success) {
		return c.json(
			{ error: { code: "INVALID_EMAIL", message: "Enter a valid email address" } },
			400,
		);
	}

	const token = c.req.param("token") ?? "";
	const prepared = await prepareSignedPdf(c, token);
	if ("response" in prepared) return prepared.response;
	return sendSignedPdf(c, prepared, parsed.data.email, token);
});

export default finalDocumentEmailEndpoint;

async function prepareSignedPdf(
	c: RequestContext,
	token: string,
): Promise<{ response: Response } | PreparedPdf> {
	const document = await getFinalDocumentByToken(token, { now: parseNow(c.req.header("x-now")) });
	if (!document) {
		return {
			response: c.json(
				{ error: { code: "FINAL_PDF_NOT_FOUND", message: "Completed PDF is not available" } },
				404,
			),
		};
	}

	const env = c.env as EmailEnvironment | undefined;
	if (!env?.EMAIL || !env.EMAIL_FROM) {
		return {
			response: c.json(
				{ error: { code: "EMAIL_UNAVAILABLE", message: "Email delivery is not available" } },
				503,
			),
		};
	}
	const bucket = env.DOCUMENTS_BUCKET;
	const object = await bucket?.get(document.r2Key);
	if (!bucket || !object) {
		return {
			response: c.json(
				{ error: { code: "FINAL_PDF_NOT_FOUND", message: "Completed PDF is not available" } },
				404,
			),
		};
	}

	let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(await object.arrayBuffer());
	if (!(await isCurrentFinalPdfArtifact(bytes))) {
		const repaired = await repairPdf(document, bucket);
		if (!repaired) {
			return {
				response: c.json(
					{
						error: {
							code: "FINAL_PDF_UNAVAILABLE",
							message: "The signed PDF could not be prepared",
						},
					},
					503,
				),
			};
		}
		bytes = repaired.bytes;
	}
	if (bytes.byteLength > maxFinalDocumentEmailAttachmentBytes) {
		return {
			response: c.json(
				{
					error: {
						code: "EMAIL_ATTACHMENT_TOO_LARGE",
						message: "This PDF is too large to email as an attachment. Download it instead.",
						maxBytes: maxFinalDocumentEmailAttachmentBytes,
					},
				},
				413,
			),
		};
	}
	return { document, bytes, env };
}

async function sendSignedPdf(
	c: RequestContext,
	prepared: PreparedPdf,
	to: string,
	token: string,
): Promise<Response> {
	try {
		await claimFinalDocumentEmailSend(token, parseNow(c.req.header("x-now")));
		await deliverSignedPdfBackupEmail(
			{ to, envelopeId: prepared.document.envelopeId, bytes: prepared.bytes },
			{
				env: prepared.env,
				baseUrl: prepared.env.APP_BASE_URL?.trim() || new URL(c.req.url).origin,
			},
		);
		return c.json({ data: { sent: true } });
	} catch (error) {
		if (error instanceof FinalDocumentEmailRateLimitError) {
			return c.json(
				{
					error: {
						code: "EMAIL_RATE_LIMITED",
						message: "Too many copies requested. Try again later.",
						retryAt: error.resetAt.toISOString(),
					},
				},
				429,
			);
		}
		if (error instanceof EmailDeliveryError) {
			return c.json(
				{
					error: {
						code: "EMAIL_DELIVERY_FAILED",
						message: "The email could not be sent. You can still download the signed PDF.",
					},
				},
				error.status === 503 ? 503 : 502,
			);
		}
		throw error;
	}
}

async function repairPdf(document: FinalDocument, bucket: R2Bucket) {
	try {
		return await regenerateFinalDocumentArtifact(document, { documentsBucket: bucket });
	} catch {
		return null;
	}
}

function parseNow(nowHeader: string | undefined): Date {
	return new Date(nowHeader ?? Date.now());
}
