import { renderBrandedEmail } from "@/lib/email-template";

export interface EmailDeliveryEnv {
	EMAIL?: SendEmail;
	EMAIL_FROM?: string;
	EMAIL_REPLY_TO?: string;
	APP_BASE_URL?: string;
	CLOUDFLARE_ENV?: string;
	EMAIL_DELIVERY_TEST_BYPASS?: string;
	RESEND_API_KEY?: string;
	RESEND_FROM_EMAIL?: string;
	RESEND_REPLY_TO_EMAIL?: string;
}

export interface EmailDeliveryOptions {
	env?: EmailDeliveryEnv;
	baseUrl: string;
	fetcher?: typeof fetch;
}

interface TransactionalEmail {
	to: string;
	subject: string;
	html: string;
	text: string;
	attachments?: EmailAttachment[];
}

interface PartnerVerificationEmailInput {
	email: string;
	recipientName: string;
	verificationUrl: string;
}

interface SenderVerificationEmailInput {
	email: string;
	senderName: string;
	verificationUrl: string;
}

interface SenderSigningEmailInput {
	email: string;
	senderName: string;
	signingUrl: string;
}

interface SenderPartnerSignedEmailInput {
	email: string;
	signerName: string;
	statusUrl: string;
}

interface SenderChangeRequestEmailInput {
	email: string;
	revisionUrl: string;
	comment: string;
}

interface HumanReviewEmailInput {
	email: string;
	documentName: string;
	actionLabel: string;
	agentName: string;
	consequence: string;
	expiresAt: string;
	reviewUrl: string;
}

interface ResendConfig {
	apiKey: string;
	fromEmail: string;
	replyToEmail: string;
}

export class EmailDeliveryError extends Error {
	constructor(
		public readonly status: number,
		public readonly responseText: string,
	) {
		super("Email provider rejected the message");
		this.name = "EmailDeliveryError";
	}
}

export function isResendConfigured(env: EmailDeliveryEnv | undefined): boolean {
	return Boolean(env?.EMAIL && env.EMAIL_FROM) || getResendConfig(env) !== null;
}

export async function deliverTransactionalEmail(
	email: TransactionalEmail,
	options: EmailDeliveryOptions,
): Promise<{ providerMessage: string | null }> {
	if (options.env?.EMAIL && options.env.EMAIL_FROM) {
		try {
			const result = await options.env.EMAIL.send({
				...email,
				from: options.env.EMAIL_FROM,
				replyTo: options.env.EMAIL_REPLY_TO,
			});
			return { providerMessage: result.messageId };
		} catch {
			throw new EmailDeliveryError(502, "Cloudflare Email Service rejected the message");
		}
	}
	if (email.attachments?.length) {
		throw new EmailDeliveryError(503, "Cloudflare Email Service is required to send attachments");
	}
	const config = getResendConfig(options.env);
	if (!config) return { providerMessage: null };

	const response = await (options.fetcher ?? fetch)("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			authorization: `Bearer ${config.apiKey}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			from: config.fromEmail,
			to: [email.to],
			subject: email.subject,
			html: email.html,
			text: email.text,
			reply_to: config.replyToEmail,
		}),
	});

	if (!response.ok) {
		throw new EmailDeliveryError(response.status, await response.text());
	}
	const body: unknown = await response.json().catch(() => null);
	return {
		providerMessage:
			body && typeof body === "object" && "id" in body && typeof body.id === "string"
				? body.id
				: null,
	};
}

export async function deliverSignedPdfBackupEmail(
	input: {
		to: string;
		envelopeId: string;
		bytes: Uint8Array;
	},
	options: EmailDeliveryOptions,
): Promise<{ providerMessage: string | null }> {
	if (!options.env?.EMAIL || !options.env.EMAIL_FROM) {
		throw new EmailDeliveryError(503, "Cloudflare Email Service is not configured for attachments");
	}
	const filename = `lumi-sign-${input.envelopeId}.pdf`;
	return deliverTransactionalEmail(
		{
			to: input.to,
			subject: "Your signed document from Lumi Sign",
			text: `Your signed PDF is attached for safekeeping.\n\nEnvelope: ${input.envelopeId}`,
			html: renderBrandedEmail({
				title: "Your signed PDF is ready",
				preview: "Your signed document is attached for safekeeping.",
				paragraphs: [
					"Your signed PDF is attached to this email. Download the attachment and keep a copy for your records.",
				],
				details: [{ label: "Envelope reference", value: input.envelopeId }],
				note: "Your document stays in My documents unless its creator deletes it.",
			}),
			attachments: [
				{
					content: input.bytes,
					filename,
					type: "application/pdf",
					disposition: "attachment",
				},
			],
		},
		options,
	);
}

export function buildPartnerVerificationEmail(
	input: PartnerVerificationEmailInput,
): TransactionalEmail {
	const name = input.recipientName.trim() || "there";
	return {
		to: input.email,
		subject: "Verify your email to sign this document",
		text: `Hi ${name},\n\nVerify your email to review and sign this document:\n${input.verificationUrl}\n\nThis link expires in 7 days.`,
		html: renderBrandedEmail({
			title: "A document is ready for your signature",
			preview: "Verify your email, review the PDF, and add your signature.",
			greeting: `Hi ${name},`,
			paragraphs: [
				"Verify your email to review and sign this document. You can read the PDF before deciding to sign.",
			],
			action: { label: "Review and sign", url: input.verificationUrl },
			note: "This link expires in 7 days. Keep it private; it gives access to your signing workflow.",
		}),
	};
}

export function buildSenderVerificationEmail(
	input: SenderVerificationEmailInput,
): TransactionalEmail {
	const name = input.senderName.trim() || "there";
	return {
		to: input.email,
		subject: "Verify your email to start signing",
		text: `Hi ${name},\n\nVerify your email to continue preparing your Lumi Sign document:\n${input.verificationUrl}\n\nThis link expires in 30 minutes.`,
		html: renderBrandedEmail({
			title: "Verify your email to get started",
			preview: "Continue preparing your PDF in Lumi Sign.",
			greeting: `Hi ${name},`,
			paragraphs: ["Verify your email to continue preparing your Lumi Sign document."],
			action: { label: "Verify email", url: input.verificationUrl },
			note: "This link expires in 30 minutes. If you did not request it, ignore this email.",
		}),
	};
}

export function buildSenderSigningEmail(input: SenderSigningEmailInput): TransactionalEmail {
	const name = input.senderName.trim() || "there";
	return {
		to: input.email,
		subject: "Sign your document",
		text: `Hi ${name},\n\nYour document is ready for your signature:\n${input.signingUrl}\n\nThis link expires in 7 days.`,
		html: renderBrandedEmail({
			title: "Your document is ready to sign",
			preview: "Review your document and complete your signature.",
			greeting: `Hi ${name},`,
			paragraphs: [
				"Your document is ready for your signature. Review the PDF and complete the fields assigned to you.",
			],
			action: { label: "Open signing page", url: input.signingUrl },
			note: "This link expires in 7 days. Keep it private.",
		}),
	};
}

export function buildSenderPartnerSignedEmail(
	input: SenderPartnerSignedEmailInput,
): TransactionalEmail {
	const signerName = input.signerName.trim() || "A signer";
	return {
		to: input.email,
		subject: "Your document was signed",
		text: `${signerName} signed your document.\n\nView document status:\n${input.statusUrl}`,
		html: renderBrandedEmail({
			title: "A signature has been added",
			preview: `${signerName} signed your document.`,
			paragraphs: [
				`${signerName} signed your document. Open the document status to see the signing progress and available PDF.`,
			],
			action: { label: "View document status", url: input.statusUrl },
		}),
	};
}

export function buildSenderChangeRequestEmail(
	input: SenderChangeRequestEmailInput,
): TransactionalEmail {
	return {
		to: input.email,
		subject: "Changes requested on your document",
		text: `A signer requested changes before completing your document.\n\nComment:\n${input.comment}\n\nUpload a revised PDF here:\n${input.revisionUrl}`,
		html: renderBrandedEmail({
			title: "Changes requested",
			preview: "A signer asked you to revise the document before signing.",
			paragraphs: [
				"A signer requested changes before completing your document. Read their comment, then upload a revised PDF.",
			],
			details: [{ label: "Signer’s comment", value: input.comment }],
			action: { label: "Upload revised PDF", url: input.revisionUrl },
		}),
	};
}

export function buildHumanReviewEmail(input: HumanReviewEmailInput): TransactionalEmail {
	const documentName = input.documentName.trim() || "Untitled document";
	const agentName = input.agentName.trim() || "An agent";
	return {
		to: input.email,
		subject: `Review requested: ${documentName}`,
		text: `${agentName} requested: ${input.actionLabel}\n\nDocument: ${documentName}\nConsequence: ${input.consequence}\nExpires: ${input.expiresAt}\n\nReview in Lumi Sign:\n${input.reviewUrl}`,
		html: renderBrandedEmail({
			title: "Your review is required",
			preview: "Review a requested action before it can proceed.",
			paragraphs: [
				`${agentName} requested ${input.actionLabel}. Review the document and consequences before making your decision.`,
			],
			details: [
				{ label: "Document", value: documentName },
				{ label: "Consequence", value: input.consequence },
				{ label: "Expires", value: input.expiresAt },
			],
			action: { label: "Review in Lumi Sign", url: input.reviewUrl },
			note: "Opening this link does not approve the action. You decide on the review page.",
		}),
	};
}

export function toAbsoluteDeliveryUrl(pathOrUrl: string, options: EmailDeliveryOptions): string {
	const baseUrl = (options.env?.APP_BASE_URL?.trim() || options.baseUrl).replace(/\/+$/, "");
	return new URL(pathOrUrl, baseUrl).toString();
}

function getResendConfig(env: EmailDeliveryEnv | undefined): ResendConfig | null {
	if (env?.CLOUDFLARE_ENV !== "production" && env?.EMAIL_DELIVERY_TEST_BYPASS === "true") {
		return null;
	}
	const apiKey = env?.RESEND_API_KEY?.trim();
	const fromEmail = env?.RESEND_FROM_EMAIL?.trim();
	const replyToEmail = env?.RESEND_REPLY_TO_EMAIL?.trim();
	if (!apiKey || !fromEmail || !replyToEmail) return null;
	return { apiKey, fromEmail, replyToEmail };
}
