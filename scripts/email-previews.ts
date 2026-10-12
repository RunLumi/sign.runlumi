import { mkdir, writeFile } from "node:fs/promises";
import {
	buildHumanReviewEmail,
	buildPartnerVerificationEmail,
	buildSenderChangeRequestEmail,
	buildSenderPartnerSignedEmail,
	buildSenderSigningEmail,
	buildSenderVerificationEmail,
} from "../src/db/envelope/email-delivery";
import { renderBrandedEmail } from "../src/lib/email-template";

const output = "output/playwright/email-previews";
await mkdir(output, { recursive: true });
const email = "preview@example.com";
const baseUrl = "https://sign.runlumi.app";
const samples = {
	"my-documents": renderBrandedEmail({
		title: "Your documents, in one place",
		preview: "Use this one-time link to open My documents.",
		paragraphs: ["Open your secure My documents link to view and manage your PDFs."],
		action: { label: "View My documents", url: `${baseUrl}/history-access/preview` },
		note: "This link expires in 30 minutes and can be used once. If you did not request it, ignore this email.",
	}),
	"agentic-access": renderBrandedEmail({
		title: "Manage your agent access",
		preview: "Verify your email to manage Lumi Sign API tokens.",
		paragraphs: ["Open your secure Agentic access link to create or manage personal API tokens."],
		action: { label: "Manage Agentic access", url: `${baseUrl}/agentic-access#preview` },
		note: "This link expires in 30 minutes and can be used once. If you did not request it, ignore this email.",
	}),
	"sender-verification": buildSenderVerificationEmail({
		email,
		senderName: "LÊ VIỆT HỒNG",
		verificationUrl: `${baseUrl}/sender-verification/preview`,
	}).html,
	"signer-invitation": buildPartnerVerificationEmail({
		email,
		recipientName: "Tiến Nguyễn Hữu",
		verificationUrl: `${baseUrl}/signing/preview`,
	}).html,
	"sender-signing": buildSenderSigningEmail({
		email,
		senderName: "LÊ VIỆT HỒNG",
		signingUrl: `${baseUrl}/signing/preview`,
	}).html,
	"signature-added": buildSenderPartnerSignedEmail({
		email,
		signerName: "Tiến Nguyễn Hữu",
		statusUrl: `${baseUrl}/my-documents`,
	}).html,
	"changes-requested": buildSenderChangeRequestEmail({
		email,
		comment: "Please update the agreement date before I sign.\nThank you.",
		revisionUrl: `${baseUrl}/source-pdf-upload`,
	}).html,
	"human-review": buildHumanReviewEmail({
		email,
		documentName: "Service agreement.pdf",
		actionLabel: "Delete document",
		agentName: "Document assistant",
		consequence: "Deletes the source and signed PDFs.",
		expiresAt: "2026-10-13T10:00:00Z",
		reviewUrl: `${baseUrl}/human-review/preview`,
	}).html,
	"signed-pdf-backup": renderBrandedEmail({
		title: "Your signed PDF is ready",
		preview: "Your signed document is attached for safekeeping.",
		paragraphs: [
			"Your signed PDF is attached to this email. Download the attachment and keep a copy for your records.",
		],
		details: [{ label: "Envelope reference", value: "Preview envelope" }],
		note: "Your document stays in My documents unless its creator deletes it.",
	}),
};
for (const [name, html] of Object.entries(samples)) {
	await writeFile(`${output}/${name}.html`, html);
	process.stdout.write(`Rendered ${name}\n`);
}
process.stdout.write(`Local email previews: ${output}; no email was sent.\n`);
