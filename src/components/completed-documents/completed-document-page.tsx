import {
	IconDownload as Download,
	IconFileText as FileText,
	IconHistory as History,
	IconUsers as Users,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Wordmark } from "@/components/layout/wordmark";
import { LoadingText } from "@/components/patterns/loading-text";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmailSignedPdfForm } from "./email-signed-pdf-form";

interface CompletedDocumentView {
	token: string;
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
	history: Array<{
		type: string;
		title: string;
		detail: string | null;
		occurredAt: string;
	}>;
}

interface CompletedDocumentPageProps {
	token: string;
}

export function CompletedDocumentPage({ token }: CompletedDocumentPageProps) {
	const [view, setView] = useState<CompletedDocumentView | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		fetch(`/api/final-documents/${token}`)
			.then(async (response) => {
				const body = (await response.json()) as {
					data?: CompletedDocumentView;
					error?: { message?: string };
				};
				if (!active) return;
				if (response.ok && body.data) {
					setView(body.data);
					setError(null);
					return;
				}
				setError(body.error?.message ?? "Completed document is not available");
			})
			.catch(() => {
				if (active) setError("Completed document is not available");
			});
		return () => {
			active = false;
		};
	}, [token]);

	return (
		<PageShell width="wide">
			<header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
				<div className="space-y-4">
					<Wordmark />
					<div className="space-y-2">
						<StatusBadge tone="success">Completed</StatusBadge>
						<h1 className="text-balance font-semibold text-3xl text-foreground">
							Completed document
						</h1>
						{view && (
							<p className="break-all text-muted-foreground text-sm tabular-nums">
								Envelope {view.envelopeId}
							</p>
						)}
					</div>
				</div>
				{view && (
					<Button asChild size="lg">
						<a href={view.finalPdf.downloadUrl}>
							<Download aria-hidden="true" className="size-4" />
							Download final PDF
						</a>
					</Button>
				)}
			</header>

			{!view && !error && (
				<LoadingText boxed>
					<span className="block font-medium text-foreground">Loading completed document…</span>
					<span className="mt-1 block text-pretty">Fetching final document details.</span>
				</LoadingText>
			)}

			{error && (
				<Alert variant="destructive" role="alert">
					<AlertTitle>{error}</AlertTitle>
				</Alert>
			)}

			{view && (
				<>
					<section className="grid gap-4 border-b pb-6 md:grid-cols-3">
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Final status</p>
							<p className="font-semibold text-lg capitalize">{view.status}</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Final PDF</p>
							<p className="inline-flex items-center gap-2 text-sm tabular-nums">
								<FileText aria-hidden="true" className="size-4" />
								{formatBytes(view.finalPdf.byteSize)}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Document hash</p>
							<p className="break-all font-mono text-xs tabular-nums">{view.finalPdf.sha256}</p>
						</div>
					</section>
					<EmailSignedPdfForm token={token} byteSize={view.finalPdf.byteSize} />

					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<Users aria-hidden="true" className="size-5" />
							<h2 className="text-balance font-semibold text-xl">Party summary</h2>
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							{view.parties.map((party) => (
								<div key={party.id} className="rounded-lg border bg-card p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-medium">{party.name}</p>
											<p className="break-all text-muted-foreground text-sm">{party.email}</p>
										</div>
										<StatusBadge tone="success">{titleCase(party.status)}</StatusBadge>
									</div>
									<p className="mt-3 text-muted-foreground text-sm tabular-nums">
										Signed date {party.signedDate ?? "not recorded"}
									</p>
								</div>
							))}
						</div>
					</section>

					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<History aria-hidden="true" className="size-5" />
							<h2 className="text-balance font-semibold text-xl">History</h2>
						</div>
						<ol className="space-y-3">
							{view.history.map((event) => (
								<li
									key={`${event.type}-${event.occurredAt}`}
									className="rounded-lg border bg-card p-4"
								>
									<p className="font-medium">{event.title}</p>
									<div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-sm tabular-nums">
										<time dateTime={event.occurredAt}>{event.occurredAt}</time>
										{event.detail && <span>{event.detail}</span>}
									</div>
								</li>
							))}
						</ol>
					</section>
				</>
			)}
		</PageShell>
	);
}

function formatBytes(value: number): string {
	return `${value.toLocaleString("en-US")} bytes`;
}

function titleCase(value: string): string {
	return value ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
}
