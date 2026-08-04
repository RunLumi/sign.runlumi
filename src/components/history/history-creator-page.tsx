import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { LoadingText } from "@/components/patterns/loading-text";
import { Panel, PanelTitle } from "@/components/patterns/panel";
import { BackLink } from "@/components/patterns/text-link";
import { SourcePdfUploadPanel } from "@/components/sender/source-pdf-upload-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HistoryCreatorView {
	envelopeId: string;
	status: string;
	signingMode: "only_me" | "me_and_another_signer";
	sender: { name: string; email: string };
	allowedActions: string[];
	resumeUrl: string;
}

export function HistoryCreatorPage({ envelopeId }: { envelopeId: string }) {
	const creatorQuery = useQuery({
		queryKey: ["history-creator", envelopeId],
		queryFn: () => fetchHistoryCreator(envelopeId),
		retry: false,
	});
	const view = creatorQuery.data;
	const preparing = view?.status === "draft" || view?.status === "changes_requested";

	return (
		<PageShell width="content">
			<BackLink href="/my-documents">Back to My documents</BackLink>
			<PageHeader
				title={preparing ? "Resume document" : "Review document"}
				lead={view ? `Status: ${historyCreatorStatus(view.status)}` : undefined}
			/>
			{creatorQuery.isPending ? <LoadingText boxed>Loading creator access…</LoadingText> : null}
			{creatorQuery.isError ? (
				<Alert role="alert" variant="destructive">
					<AlertTitle>Creator access unavailable</AlertTitle>
					<AlertDescription>
						Return to My documents and refresh the current status.
					</AlertDescription>
				</Alert>
			) : null}
			{view && preparing ? (
				<SourcePdfUploadPanel
					envelopeId={view.envelopeId}
					senderSessionToken=""
					historyAccess
					senderName={view.sender.name}
					senderEmail={view.sender.email}
					signingMode={view.signingMode}
				/>
			) : null}
			{view && !preparing ? (
				<Panel className="space-y-2">
					<PanelTitle>Current creator actions</PanelTitle>
					<p className="text-muted-foreground text-sm">
						{view.allowedActions.length > 0
							? view.allowedActions.join(", ")
							: "No creator action is available."}
					</p>
				</Panel>
			) : null}
		</PageShell>
	);
}

async function fetchHistoryCreator(envelopeId: string): Promise<HistoryCreatorView> {
	const response = await fetch(`/api/history/documents/${encodeURIComponent(envelopeId)}/creator`, {
		credentials: "same-origin",
	});
	const body = (await response.json().catch(() => null)) as { data?: HistoryCreatorView } | null;
	if (!response.ok || !body?.data) throw new Error("Creator access unavailable");
	return body.data;
}

function historyCreatorStatus(status: string): string {
	return status.replaceAll("_", " ");
}
