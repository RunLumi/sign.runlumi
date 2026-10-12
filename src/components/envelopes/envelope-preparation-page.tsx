import { IconFilePlus as FilePlus2, IconFileUpload as FileUp } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { LoadingText } from "@/components/patterns/loading-text";
import { Panel, PanelDescription, PanelTitle } from "@/components/patterns/panel";
import { SignatureProfilePanel } from "@/components/sender/signature-profile-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EnvelopeFieldEditor } from "./field-editor";

interface PreparationRecipient {
	id: string;
	name: string;
	email: string;
}

interface EnvelopePreparationPageProps {
	envelopeId?: string;
	senderSessionToken?: string;
	historyAccess?: boolean;
	recipients?: PreparationRecipient[];
}

type PreparationState = {
	envelopeId: string;
	recipients: PreparationRecipient[];
};

type EnvelopeCreateResponse = {
	data?: {
		id?: string;
	};
};

type RecipientsCreateResponse = {
	data?: PreparationRecipient[];
};
type SendEnvelopeResponse = {
	data?: {
		emailSendCount?: number;
	};
	error?: {
		code?: string;
		message?: string;
		providerMessage?: string;
	};
};
type SourceDocumentResponse = {
	id: string;
	envelopeId: string;
	r2Key: string;
	version: number;
	sha256: string;
	byteSize: number;
	contentType: "application/pdf";
	uploadedBy: string;
	uploadedAt: string;
};
type SourcePdfResponse = {
	data?: SourceDocumentResponse;
	error?: {
		code?: string;
		message?: string;
	};
};
type SourcePdfStatus =
	| { status: "ready"; document: SourceDocumentResponse }
	| { status: "missing"; message: string };

const defaultSender = {
	name: "Ada Lovelace",
	emailPrefix: "ada",
};
const defaultPartner = {
	name: "Grace Hopper",
	emailPrefix: "grace",
};

export function EnvelopePreparationPage({
	envelopeId,
	senderSessionToken,
	historyAccess = false,
	recipients,
}: EnvelopePreparationPageProps) {
	const [preparation, setPreparation] = useState<PreparationState | null>(
		envelopeId && recipients && recipients.length >= 2 ? { envelopeId, recipients } : null,
	);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function createReviewEnvelope() {
		setIsCreating(true);
		setError(null);
		try {
			const createdEnvelope = await postJson<EnvelopeCreateResponse>("/api/envelopes", {});
			const createdEnvelopeId = createdEnvelope.data?.id;
			if (!createdEnvelopeId) throw new Error("Envelope response missing id");

			const suffix = Date.now();
			const createdRecipients = await postJson<RecipientsCreateResponse>(
				`/api/envelopes/${createdEnvelopeId}/recipients`,
				{
					recipients: [
						{
							name: defaultSender.name,
							email: `${defaultSender.emailPrefix}.${suffix}@example.com`,
						},
						{
							name: defaultPartner.name,
							email: `${defaultPartner.emailPrefix}.${suffix}@example.com`,
						},
					],
				},
			);
			const reviewRecipients = createdRecipients.data;
			if (!reviewRecipients || reviewRecipients.length < 2) {
				throw new Error("Recipient response missing recipients");
			}
			setPreparation({ envelopeId: createdEnvelopeId, recipients: reviewRecipients });
		} catch {
			setError("Unable to create a review envelope.");
		} finally {
			setIsCreating(false);
		}
	}

	return (
		<PageShell width="wide">
			<PageHeader
				title="Envelope preparation"
				lead="Create a sender signature profile and place fields for each signer."
			/>
			{preparation ? (
				<>
					<SignatureProfilePanel
						envelopeId={preparation.envelopeId}
						senderSessionToken={senderSessionToken}
						historyAccess={historyAccess}
					/>
					<EnvelopeFieldEditor
						envelopeId={preparation.envelopeId}
						recipients={preparation.recipients}
						senderSessionToken={senderSessionToken}
						historyAccess={historyAccess}
					/>
					<SendEnvelopePanel
						envelopeId={preparation.envelopeId}
						senderSessionToken={senderSessionToken}
						historyAccess={historyAccess}
					/>
				</>
			) : (
				<Panel className="space-y-4">
					<div>
						<PanelTitle>Review setup</PanelTitle>
						<PanelDescription>
							Create a draft review envelope before saving signatures or fields.
						</PanelDescription>
					</div>
					<Button type="button" onClick={createReviewEnvelope} disabled={isCreating}>
						<FilePlus2 aria-hidden="true" className="size-4" />
						{isCreating ? "Creating…" : "Create review envelope"}
					</Button>
					{error ? (
						<Alert variant="destructive" role="alert">
							<AlertTitle>Review setup failed</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}
				</Panel>
			)}
		</PageShell>
	);
}

function SendEnvelopePanel({
	envelopeId,
	senderSessionToken,
	historyAccess = false,
}: {
	envelopeId: string;
	senderSessionToken?: string;
	historyAccess?: boolean;
}) {
	const sourcePdfQuery = useQuery({
		queryKey: ["source-pdf", envelopeId, historyAccess ? "history" : senderSessionToken],
		queryFn: () => fetchSourcePdf(envelopeId, senderSessionToken, historyAccess),
		staleTime: 30_000,
	});
	const sendMutation = useMutation({
		mutationFn: () => sendEnvelopeRequest(envelopeId, senderSessionToken, historyAccess),
	});
	const sourcePdfStatus = sourcePdfQuery.data;
	const sourcePdfReady = sourcePdfStatus?.status === "ready";
	const sourcePdfMissing = sourcePdfStatus?.status === "missing";
	const sourcePdfError =
		sourcePdfQuery.error instanceof Error ? sourcePdfQuery.error.message : null;
	const sendError = sendMutation.error instanceof Error ? sendMutation.error.message : null;
	const sentEmailCount = sendMutation.data?.emailSendCount;
	const uploadUrl = buildSourcePdfUploadUrl(envelopeId, senderSessionToken, historyAccess);

	return (
		<Panel className="space-y-4">
			<div>
				<PanelTitle>Send envelope</PanelTitle>
				<PanelDescription>
					Send verification links to the recipients when fields are ready.
				</PanelDescription>
			</div>
			{sourcePdfQuery.isLoading ? <LoadingText>Checking source PDF…</LoadingText> : null}
			{sourcePdfMissing ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>Source PDF required</AlertTitle>
					<AlertDescription className="space-y-3">
						<p>{sourcePdfStatus.message}</p>
						<Button asChild size="sm" variant="outline">
							<a href={uploadUrl}>
								<FileUp aria-hidden="true" className="size-4" />
								Upload PDF
							</a>
						</Button>
					</AlertDescription>
				</Alert>
			) : null}
			{sourcePdfReady ? (
				<Alert>
					<AlertTitle>Source PDF ready</AlertTitle>
					<AlertDescription className="tabular-nums">
						Version {sourcePdfStatus.document.version} · {sourcePdfStatus.document.byteSize} bytes
					</AlertDescription>
				</Alert>
			) : null}
			{sourcePdfError ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>Source PDF check failed</AlertTitle>
					<AlertDescription>{sourcePdfError}</AlertDescription>
				</Alert>
			) : null}
			{sendError ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>Send failed</AlertTitle>
					<AlertDescription>{sendError}</AlertDescription>
				</Alert>
			) : null}
			{sentEmailCount !== undefined ? (
				<Alert>
					<AlertTitle>Envelope sent</AlertTitle>
					<AlertDescription>
						Created <span className="tabular-nums">{sentEmailCount}</span> recipient email send
						record
						{sentEmailCount === 1 ? "" : "s"}.
					</AlertDescription>
				</Alert>
			) : null}
			<Button
				type="button"
				onClick={() => sendMutation.mutate()}
				disabled={sendMutation.isPending || sentEmailCount !== undefined || !sourcePdfReady}
			>
				{sendMutation.isPending ? "Sending…" : "Send envelope"}
			</Button>
		</Panel>
	);
}

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-internal-user-id": "ui-user",
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) throw new Error("Request failed");
	return (await response.json()) as TResponse;
}

function authHeaders(
	senderSessionToken: string | undefined,
	historyAccess = false,
): Record<string, string> {
	if (historyAccess) {
		return { "Content-Type": "application/json", "x-history-session-access": "true" };
	}
	if (senderSessionToken) {
		return {
			"Content-Type": "application/json",
			"x-sender-session-token": senderSessionToken,
		};
	}
	return {
		"Content-Type": "application/json",
		"x-internal-user-id": "ui-user",
	};
}

async function fetchSourcePdf(
	envelopeId: string,
	senderSessionToken: string | undefined,
	historyAccess = false,
): Promise<SourcePdfStatus> {
	const response = await fetch(`/api/envelopes/${envelopeId}/source-pdf`, {
		headers: authHeaders(senderSessionToken, historyAccess),
	});
	const json = (await response.json().catch((): SourcePdfResponse => ({}))) as
		| SourcePdfResponse
		| undefined;
	if (response.status === 404 && json?.error?.code === "SOURCE_PDF_NOT_FOUND") {
		return {
			status: "missing",
			message:
				json.error.message ?? "Upload a source PDF before preparing or sending this envelope",
		};
	}
	if (!response.ok || !json?.data) {
		throw new Error(json?.error?.message ?? "Unable to check the source PDF.");
	}
	return { status: "ready", document: json.data };
}

async function sendEnvelopeRequest(
	envelopeId: string,
	senderSessionToken: string | undefined,
	historyAccess = false,
): Promise<{ emailSendCount: number }> {
	const response = await fetch(`/api/envelopes/${envelopeId}/actions`, {
		method: "POST",
		headers: authHeaders(senderSessionToken, historyAccess),
		body: JSON.stringify({ action: "send" }),
	});
	const json = (await response.json().catch((): SendEnvelopeResponse => ({}))) as
		| SendEnvelopeResponse
		| undefined;
	if (!response.ok) {
		throw new Error(
			json?.error?.providerMessage ?? json?.error?.message ?? "Unable to send this envelope.",
		);
	}
	return { emailSendCount: json?.data?.emailSendCount ?? 0 };
}

function buildSourcePdfUploadUrl(
	envelopeId: string,
	senderSessionToken: string | undefined,
	historyAccess = false,
): string {
	if (historyAccess) return `/my-documents/${envelopeId}/manage`;
	const params = new URLSearchParams({ envelopeId });
	if (senderSessionToken) params.set("senderSessionToken", senderSessionToken);
	return `/source-pdf-upload?${params.toString()}`;
}
