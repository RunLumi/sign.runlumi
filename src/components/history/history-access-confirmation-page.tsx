import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { LoadingText } from "@/components/patterns/loading-text";
import { TextLink } from "@/components/patterns/text-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface HistoryAccessConfirmationPageProps {
	credential: string;
	onAuthenticated?: (url: string) => void;
	returnTo?: string;
}

interface LinkInspectionResponse {
	data: {
		state: "confirm" | "unknown" | "consumed" | "expired" | "revoked";
		expiresAt?: string;
	};
}

interface RedemptionResponse {
	data: { status: "authenticated"; redirectUrl: string };
}

const defaultOnAuthenticated = (url: string) => window.location.assign(url);
const recoveryByState = {
	unknown: {
		title: "Link not recognized",
		message: "This link is not available. Request a new secure link to continue.",
	},
	consumed: {
		title: "Link already used",
		message: "This one-time link was already used. Request a new link for this browser.",
	},
	expired: {
		title: "Link expired",
		message: "This secure link has expired. Request a new link to continue.",
	},
	revoked: {
		title: "Link replaced",
		message: "A newer access request replaced this link. Request another link if needed.",
	},
} as const;

export function HistoryAccessConfirmationPage({
	credential,
	onAuthenticated = defaultOnAuthenticated,
	returnTo,
}: HistoryAccessConfirmationPageProps) {
	const recoveryHeadingRef = useRef<HTMLHeadingElement>(null);
	const encodedCredential = encodeURIComponent(credential);
	const inspection = useQuery({
		queryKey: ["history-access-link"],
		gcTime: 0,
		queryFn: async () => {
			const response = await fetch(`/api/history/access-links/${encodedCredential}`, {
				method: "GET",
				credentials: "same-origin",
			});
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok || !isLinkInspectionResponse(body)) {
				throw new Error("Unable to inspect My documents link");
			}
			return body.data;
		},
	});
	const redemption = useMutation({
		mutationFn: async () => {
			const response = await fetch(`/api/history/access-links/${encodedCredential}/redeem`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ ...(returnTo ? { returnTo } : {}) }),
			});
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok || !isRedemptionResponse(body)) {
				throw new Error("Unable to redeem My documents link");
			}
			return body.data;
		},
		onSuccess: (data) => onAuthenticated(data.redirectUrl),
	});
	const recovery =
		inspection.data && inspection.data.state !== "confirm"
			? recoveryByState[inspection.data.state]
			: inspection.isError || redemption.isError
				? { title: "Link unavailable", message: "Request a new secure link to continue." }
				: null;

	useEffect(() => {
		if (recovery) recoveryHeadingRef.current?.focus();
	}, [recovery]);

	return (
		<PageShell width="narrow">
			<PageHeader title="Confirm My documents access" />
			{inspection.isPending ? <LoadingText>Checking this secure link…</LoadingText> : null}
			{inspection.data?.state === "confirm" ? (
				<>
					<p className="text-pretty text-muted-foreground">
						Continue only if you requested access to your Signmos documents.
					</p>
					<Button type="button" onClick={() => redemption.mutate()} disabled={redemption.isPending}>
						{redemption.isPending ? "Confirming…" : "Continue to My documents"}
					</Button>
				</>
			) : null}
			{recovery ? (
				<Alert role="alert" variant="destructive">
					<AlertTitle>
						<h2 ref={recoveryHeadingRef} tabIndex={-1}>
							{recovery.title}
						</h2>
					</AlertTitle>
					<AlertDescription>
						<p>{recovery.message}</p>
						<TextLink className="mt-2 inline-flex" href="/?task=my-documents">
							Request a new link
						</TextLink>
					</AlertDescription>
				</Alert>
			) : null}
		</PageShell>
	);
}

function isLinkInspectionResponse(value: unknown): value is LinkInspectionResponse {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	return Boolean(data && typeof data === "object" && "state" in data);
}

function isRedemptionResponse(value: unknown): value is RedemptionResponse {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	return Boolean(data && typeof data === "object" && "redirectUrl" in data);
}
