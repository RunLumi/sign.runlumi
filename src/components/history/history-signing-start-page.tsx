import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { AuthenticatedProductNavigation } from "@/components/navigation/product-mode-navigation";
import { LoadingText } from "@/components/patterns/loading-text";
import { TextLink } from "@/components/patterns/text-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	HistoryEnvelopeStart,
	type HistorySessionIdentity,
	type HistoryStartSigningMode,
} from "./history-envelope-start";

interface HistoryIdentityResponse {
	data: { identity: HistorySessionIdentity };
}

const signingModeContent = {
	only_me: {
		heading: "Sign a PDF by yourself",
		description: "Start a new document using your verified My documents identity.",
	},
	me_and_another_signer: {
		heading: "Sign a PDF with someone else",
		description: "Start a new document and add one other signer after uploading your PDF.",
	},
} as const;

export function HistorySigningStartPage({ signingMode }: { signingMode: HistoryStartSigningMode }) {
	const identity = useQuery({
		queryKey: ["history-start-identity"],
		queryFn: fetchHistoryIdentity,
	});
	const content = signingModeContent[signingMode];

	return (
		<PageShell width="content">
			<AuthenticatedProductNavigation activeMode={signingMode} />
			<PageHeader title={content.heading} lead={content.description} />
			{identity.isPending ? <LoadingText boxed>Loading your verified identity…</LoadingText> : null}
			{identity.isError ? (
				<Alert role="alert" variant="destructive">
					<AlertTitle>My documents access required</AlertTitle>
					<AlertDescription>
						<TextLink href="/?task=my-documents">Verify your email to continue</TextLink>
					</AlertDescription>
				</Alert>
			) : null}
			{identity.data ? (
				<HistoryEnvelopeStart
					identity={identity.data}
					initialSigningMode={signingMode}
					collapsible={false}
				/>
			) : null}
		</PageShell>
	);
}

async function fetchHistoryIdentity(): Promise<HistorySessionIdentity> {
	const response = await fetch("/api/history/documents?page=1", { credentials: "same-origin" });
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok || !isHistoryIdentityResponse(body)) {
		throw new Error("My documents access is required");
	}
	return body.data.identity;
}

function isHistoryIdentityResponse(value: unknown): value is HistoryIdentityResponse {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	return Boolean(data && typeof data === "object" && "identity" in data);
}
