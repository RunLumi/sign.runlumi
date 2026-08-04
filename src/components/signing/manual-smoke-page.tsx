import { Check, FileText, Play, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/patterns/panel";
import { TextLink } from "@/components/patterns/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VerificationLink {
	recipientId: string;
	email: string;
	token: string;
	url: string;
	expiresAt: string;
}

interface SigningLink {
	token: string;
	url: string;
}

interface CompletedDocumentLink {
	url: string;
	downloadUrl: string;
}

interface SmokeState {
	envelopeId: string;
	recipientId: string;
	verificationLink: VerificationLink;
	signingLink: SigningLink | null;
	completedDocument: CompletedDocumentLink | null;
	finalPdfAvailable: boolean;
}

export function ManualSigningSmokePage() {
	const [state, setState] = useState<SmokeState | null>(null);
	const [signatureName, setSignatureName] = useState("Ada Lovelace");
	const [date, setDate] = useState("2026-05-20");
	const [message, setMessage] = useState<string | null>(null);

	async function runSetup() {
		setMessage("Creating envelope…");
		const envelope = await postJson<{ id: string }>("/api/envelopes", undefined, {
			"x-internal-user-id": "manual-ui",
			"idempotency-key": `manual-ui-create-${crypto.randomUUID()}`,
		});
		const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF\n");
		await fetch(`/api/envelopes/${envelope.id}/source-pdf`, {
			method: "POST",
			headers: {
				"x-internal-user-id": "manual-ui",
				"idempotency-key": `manual-ui-upload-${crypto.randomUUID()}`,
				"content-type": "application/pdf",
			},
			body: pdf,
		});
		const recipients = await postJson<Array<{ id: string }>>(
			`/api/envelopes/${envelope.id}/recipients`,
			{ recipients: [{ name: "Ada Lovelace", email: "ada@example.com" }] },
			{ "x-internal-user-id": "manual-ui" },
		);
		const recipientId = recipients[0]?.id ?? "";
		await postJson(
			`/api/envelopes/${envelope.id}/fields`,
			{
				fields: [
					{ recipientId, type: "signature", page: 1, x: 72, y: 144, width: 180, height: 48 },
					{ recipientId, type: "date", page: 1, x: 300, y: 144, width: 120, height: 32 },
				],
			},
			{ "x-internal-user-id": "manual-ui" },
		);
		const sent = await postJson<{ verificationLinks: VerificationLink[] }>(
			`/api/envelopes/${envelope.id}/actions`,
			{ action: "send" },
			{
				"x-internal-user-id": "manual-ui",
				"x-email-delivery-test-bypass": "true",
			},
		);
		const verificationLink = sent.verificationLinks[0] ?? {
			recipientId,
			email: "ada@example.com",
			token: "",
			url: "",
			expiresAt: "",
		};
		setState({
			envelopeId: envelope.id,
			recipientId,
			verificationLink,
			signingLink: null,
			completedDocument: null,
			finalPdfAvailable: false,
		});
		setMessage("Envelope sent");
	}

	async function verifyPartner() {
		if (!state) return;
		const verified = await getJson<{ signingLink: SigningLink }>(
			`/api/signing/verifications/${state.verificationLink.token}`,
		);
		setState({ ...state, signingLink: verified.signingLink });
		setMessage("Partner verified");
	}

	async function completeInPage(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!state?.signingLink) return;
		await postJson(
			`/api/signing/${state.signingLink.token}/complete`,
			{ signatureName, date },
			{ "x-email-delivery-test-bypass": "true" },
		);
		const status = await getJson<{ finalPdfAvailable: boolean }>(
			`/api/envelopes/${state.envelopeId}/status`,
		);
		let completedDocument: CompletedDocumentLink | null = null;
		if (status.finalPdfAvailable) {
			const completed = await getJson<{ completedDocument?: CompletedDocumentLink }>(
				`/api/signing/${state.signingLink.token}`,
			);
			completedDocument = completed.completedDocument ?? null;
		}
		setState({ ...state, completedDocument, finalPdfAvailable: status.finalPdfAvailable });
		setMessage(status.finalPdfAvailable ? "Final PDF is available" : "Signing complete");
	}

	return (
		<PageShell width="wide">
			<PageHeader
				title="Manual signing smoke test"
				lead="Create, prepare, send, sign, and verify one envelope from the browser."
			/>
			<Panel>
				<Button type="button" onClick={runSetup}>
					<Play aria-hidden="true" className="size-4" />
					Run setup
				</Button>
			</Panel>
			{state && (
				<Panel className="grid gap-4">
					<div className="grid gap-2 text-sm">
						<p>
							Envelope: <span className="font-mono">{state.envelopeId}</span>
						</p>
						<TextLink className="break-all" href={state.verificationLink.url}>
							{state.verificationLink.url}
						</TextLink>
						{state.signingLink && (
							<TextLink className="break-all" href={state.signingLink.url}>
								{state.signingLink.url}
							</TextLink>
						)}
					</div>
					<Button type="button" variant="outline" onClick={verifyPartner}>
						<ShieldCheck aria-hidden="true" className="size-4" />
						Verify partner
					</Button>
					<form onSubmit={completeInPage} className="grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="manual-signature-name">Typed signature</Label>
							<Input
								id="manual-signature-name"
								value={signatureName}
								onChange={(event) => setSignatureName(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="manual-signing-date">Signing date</Label>
							<Input
								id="manual-signing-date"
								type="date"
								value={date}
								onChange={(event) => setDate(event.target.value)}
							/>
						</div>
						<div className="flex items-end">
							<Button type="submit" className="w-full" disabled={!state.signingLink}>
								<Send aria-hidden="true" className="size-4" />
								Complete in page
							</Button>
						</div>
					</form>
					{state.finalPdfAvailable && state.completedDocument && (
						<div className="flex flex-wrap gap-3">
							<TextLink
								className="inline-flex items-center gap-2"
								href={state.completedDocument.url}
							>
								<FileText aria-hidden="true" className="size-4" />
								View completed document
							</TextLink>
							<TextLink
								className="inline-flex items-center gap-2"
								href={state.completedDocument.downloadUrl}
							>
								<FileText aria-hidden="true" className="size-4" />
								Download final PDF
							</TextLink>
						</div>
					)}
				</Panel>
			)}
			{message && (
				<p className="inline-flex items-center gap-2 text-muted-foreground text-sm">
					<Check aria-hidden="true" className="size-4" />
					{message}
				</p>
			)}
		</PageShell>
	);
}

async function postJson<T = unknown>(
	path: string,
	body?: unknown,
	headers: Record<string, string> = {},
): Promise<T> {
	const response = await fetch(path, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const payload = (await response.json()) as { data?: T; error?: { message?: string } };
	if (!response.ok || payload.data === undefined) {
		throw new Error(payload.error?.message ?? `Request failed with status ${response.status}`);
	}
	return payload.data;
}

async function getJson<T>(path: string): Promise<T> {
	const response = await fetch(path);
	const payload = (await response.json()) as { data?: T; error?: { message?: string } };
	if (!response.ok || payload.data === undefined) {
		throw new Error(payload.error?.message ?? `Request failed with status ${response.status}`);
	}
	return payload.data;
}
