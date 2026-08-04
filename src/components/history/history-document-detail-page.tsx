import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { LoadingText } from "@/components/patterns/loading-text";
import { StatusBadge } from "@/components/patterns/status-badge";
import { BackLink, TextLink } from "@/components/patterns/text-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HistoryDocumentDetailPageProps {
	envelopeId: string;
}

interface HistoryDocumentDetail {
	envelopeId: string;
	status: "completed";
	finalPdf: {
		downloadUrl: string;
		contentType: "application/pdf";
		byteSize: number;
		sha256: string;
		createdAt: string | null;
	};
	parties: Array<{
		id: string;
		name: string;
		email: string;
		status: string;
		signedDate: string | null;
		signedAt: string | null;
	}>;
	history: Array<{ type: string; title: string; detail: string | null; occurredAt: string }>;
}

interface HistoryDocumentDetailResponse {
	data: HistoryDocumentDetail;
}

export function HistoryDocumentDetailPage({ envelopeId }: HistoryDocumentDetailPageProps) {
	const detailQuery = useQuery({
		queryKey: ["history-document", envelopeId],
		queryFn: async () => {
			const response = await fetch(`/api/history/documents/${encodeURIComponent(envelopeId)}`, {
				credentials: "same-origin",
			});
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok || !isHistoryDocumentDetailResponse(body)) {
				throw new Error("Unable to load completed document");
			}
			return body.data;
		},
	});

	return (
		<PageShell width="content">
			<BackLink href="/my-documents">Back to My documents</BackLink>
			<PageHeader title="Completed document" />
			{detailQuery.isPending ? <LoadingText>Loading completed document…</LoadingText> : null}
			{detailQuery.isError ? (
				<Alert role="alert" variant="destructive">
					<AlertTitle>Document unavailable</AlertTitle>
					<AlertDescription>Return to My documents and try again.</AlertDescription>
				</Alert>
			) : null}
			{detailQuery.data ? (
				<>
					<div>
						<StatusBadge tone="success">Completed</StatusBadge>
					</div>
					<TextLink className="inline-flex" href={detailQuery.data.finalPdf.downloadUrl}>
						Download signed PDF
					</TextLink>
					<section aria-labelledby="history-parties-heading" className="space-y-3">
						<h2 id="history-parties-heading" className="font-semibold text-foreground text-xl">
							Parties
						</h2>
						<ul className="grid gap-3">
							{detailQuery.data.parties.map((party) => (
								<li key={party.id} className="rounded-lg border bg-card p-4">
									<p className="font-medium text-foreground">{party.name}</p>
									<p className="text-muted-foreground text-sm">{party.email}</p>
								</li>
							))}
						</ul>
					</section>
				</>
			) : null}
		</PageShell>
	);
}

function isHistoryDocumentDetailResponse(value: unknown): value is HistoryDocumentDetailResponse {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	return Boolean(
		data &&
			typeof data === "object" &&
			"envelopeId" in data &&
			"finalPdf" in data &&
			"parties" in data,
	);
}
