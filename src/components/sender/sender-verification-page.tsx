import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { LoadingText } from "@/components/patterns/loading-text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface SenderVerificationPageProps {
	token: string;
	onVerified?: (url: string) => void;
}

type VerificationState =
	| { status: "verifying" }
	| { status: "verified"; uploadUrl: string; email: string }
	| { status: "error"; message: string };

type VerifiedSender = {
	name: string;
	email: string;
};

type SigningMode = "only_me" | "me_and_another_signer";

type SenderVerificationSuccess = {
	data: {
		envelopeId: string;
		signingMode: SigningMode;
		senderSessionToken: string;
		sender: VerifiedSender;
	};
};

type SenderVerificationError = {
	error: {
		message: string;
	};
};

const defaultOnVerified = (url: string) => {
	window.location.assign(url);
};

export function SenderVerificationPage({
	token,
	onVerified = defaultOnVerified,
}: SenderVerificationPageProps) {
	const [state, setState] = useState<VerificationState>({ status: "verifying" });
	const apiUrl = useMemo(
		() => `/api/envelopes/sender-verifications/${encodeURIComponent(token)}`,
		[token],
	);

	useEffect(() => {
		let cancelled = false;

		async function verify() {
			const response = await fetch(apiUrl);
			const json: unknown = await response.json().catch(() => null);
			if (cancelled) return;
			if (!response.ok || !isSenderVerificationSuccess(json)) {
				const message = isSenderVerificationError(json)
					? json.error.message
					: "Unable to verify this sender link";
				setState({ status: "error", message });
				return;
			}

			const uploadUrl = buildUploadUrl(
				json.data.envelopeId,
				json.data.senderSessionToken,
				json.data.sender,
				json.data.signingMode,
			);
			setState({ status: "verified", uploadUrl, email: json.data.sender.email });
			onVerified(uploadUrl);
		}

		verify().catch(() => {
			if (!cancelled) setState({ status: "error", message: "Unable to verify this sender link" });
		});

		return () => {
			cancelled = true;
		};
	}, [apiUrl, onVerified]);

	return (
		<PageShell width="narrow">
			<PageHeader title="Sender verification" />

			{state.status === "verifying" ? <LoadingText boxed>Verifying email…</LoadingText> : null}

			{state.status === "verified" ? (
				<Alert>
					<Check aria-hidden="true" className="size-4" />
					<AlertTitle>Email verified</AlertTitle>
					<AlertDescription>{state.email} is verified for this envelope.</AlertDescription>
				</Alert>
			) : null}

			{state.status === "error" ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>Verification failed</AlertTitle>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			) : null}

			{state.status === "verified" ? (
				<Button asChild>
					<a href={state.uploadUrl}>Continue to upload PDF</a>
				</Button>
			) : null}
		</PageShell>
	);
}

function buildUploadUrl(
	envelopeId: string,
	senderSessionToken: string,
	sender: VerifiedSender,
	signingMode: SigningMode,
): string {
	const params = new URLSearchParams({
		envelopeId,
		senderSessionToken,
		senderName: sender.name,
		senderEmail: sender.email,
		signingMode,
	});
	return `/source-pdf-upload?${params.toString()}`;
}

function isSenderVerificationSuccess(value: unknown): value is SenderVerificationSuccess {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	return Boolean(
		data &&
			typeof data === "object" &&
			"envelopeId" in data &&
			"senderSessionToken" in data &&
			"sender" in data,
	);
}

function isSenderVerificationError(value: unknown): value is SenderVerificationError {
	if (!value || typeof value !== "object" || !("error" in value)) return false;
	const error = value.error;
	return Boolean(error && typeof error === "object" && "message" in error);
}
