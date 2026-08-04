import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { LoadingText } from "@/components/patterns/loading-text";
import { Panel, PanelTitle } from "@/components/patterns/panel";
import { TextLink } from "@/components/patterns/text-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface HumanReviewDetail {
	commandId: string;
	reviewId: string;
	status: string;
	expiresAt: string;
	document: {
		documentId: string;
		title: string;
		sourceVersion: number;
		sourceSha256: string;
		sourcePdfUrl: string | null;
		assignedFields: Array<{
			id: string;
			type: string;
			page: number;
			x: number;
			y: number;
			width: number;
			height: number;
		}>;
	};
	action: {
		kind: "complete" | "decline" | "cancel" | "expire" | "delete";
		label: string;
		payload: string;
		consequence: string;
	};
	agent: { name: string };
}

interface HumanReviewPageProps {
	reviewId: string;
	onNotNow?: () => void;
	onVerificationRequired?: (url: string) => void;
}

const defaultOnNotNow = () => window.location.assign("/my-documents");
const defaultOnVerificationRequired = (url: string) => window.location.assign(url);

export function HumanReviewPage({
	reviewId,
	onNotNow = defaultOnNotNow,
	onVerificationRequired = defaultOnVerificationRequired,
}: HumanReviewPageProps) {
	const terminalStatusRef = useRef<HTMLOutputElement>(null);
	const detailQuery = useQuery({
		queryKey: ["human-review", reviewId],
		queryFn: () => fetchHumanReview(reviewId),
	});
	const decision = useMutation({
		mutationFn: (value: "approve" | "reject") => decideHumanReview(reviewId, value),
	});

	useEffect(() => {
		if (decision.isSuccess) terminalStatusRef.current?.focus();
	}, [decision.isSuccess]);
	useEffect(() => {
		if (detailQuery.error instanceof HumanReviewAuthenticationError) {
			onVerificationRequired(detailQuery.error.recoveryUrl);
		}
	}, [detailQuery.error, onVerificationRequired]);

	const detail = detailQuery.data;
	const pending = detail?.status === "pending_human_review" && !decision.isSuccess;
	return (
		<PageShell width="content">
			<PageHeader title="Review requested action" />
			{detailQuery.isPending ? <LoadingText>Loading review…</LoadingText> : null}
			{detailQuery.isError || decision.isError ? (
				<Alert role="alert" variant="destructive">
					<AlertTitle>Unable to continue this review</AlertTitle>
					<AlertDescription>
						The request may be unavailable, expired, changed, or already decided.
					</AlertDescription>
				</Alert>
			) : null}
			{detail ? <ReviewDetails detail={detail} /> : null}
			{detail && detail.status !== "pending_human_review" ? (
				<LoadingText boxed className="text-foreground">
					{terminalStatusMessage(detail.status)}
				</LoadingText>
			) : null}
			{pending ? (
				<fieldset className="flex flex-wrap gap-3">
					<legend className="sr-only">Human review decision</legend>
					<Button
						type="button"
						onClick={() => decision.mutate("approve")}
						disabled={decision.isPending}
					>
						{decision.isPending ? "Executing…" : "Approve and execute"}
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={() => decision.mutate("reject")}
						disabled={decision.isPending}
					>
						Reject request
					</Button>
					<Button type="button" variant="outline" onClick={onNotNow} disabled={decision.isPending}>
						Not now
					</Button>
				</fieldset>
			) : null}
			{decision.isSuccess ? (
				<LoadingText ref={terminalStatusRef} tabIndex={-1} boxed className="text-foreground">
					{terminalStatusMessage(decision.data.status)}
				</LoadingText>
			) : null}
		</PageShell>
	);
}

function ReviewDetails({ detail }: { detail: HumanReviewDetail }) {
	return (
		<Panel className="space-y-5">
			<div>
				<PanelTitle>{detail.document.title}</PanelTitle>
				<p className="text-muted-foreground text-sm tabular-nums">
					Current revision {detail.document.sourceVersion} · Expires {formatDate(detail.expiresAt)}
				</p>
			</div>
			{detail.document.sourcePdfUrl ? (
				<TextLink
					className="inline-flex"
					href={detail.document.sourcePdfUrl}
					target="_blank"
					rel="noreferrer"
				>
					Open current PDF
				</TextLink>
			) : (
				<p className="text-muted-foreground text-sm">
					The reviewed source PDF is no longer retained.
				</p>
			)}
			<div>
				<p className="font-medium text-foreground">Requested by</p>
				<p className="text-muted-foreground">{detail.agent.name}</p>
			</div>
			<div>
				<p className="font-medium text-foreground">{detail.action.label}</p>
				<p className="text-destructive">{detail.action.consequence}</p>
			</div>
			<div>
				<p className="font-medium text-foreground">Exact proposed payload</p>
				<pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">
					{detail.action.payload}
				</pre>
			</div>
			{detail.document.assignedFields.length > 0 ? (
				<ul className="list-disc space-y-1 pl-5 text-muted-foreground text-sm tabular-nums">
					{detail.document.assignedFields.map((field) => (
						<li key={field.id}>
							{field.type} field on page {field.page} at ({field.x}, {field.y}), {field.width} ×{" "}
							{field.height}
						</li>
					))}
				</ul>
			) : null}
		</Panel>
	);
}

async function fetchHumanReview(reviewId: string): Promise<HumanReviewDetail> {
	const response = await fetch(`/api/history/human-reviews/${encodeURIComponent(reviewId)}`, {
		credentials: "same-origin",
	});
	const body: unknown = await response.json().catch(() => null);
	if (response.status === 401 && isRecoveryResponse(body)) {
		throw new HumanReviewAuthenticationError(body.error.recoveryUrl);
	}
	if (!response.ok || !isDetailResponse(body)) throw new Error("Unable to load human review");
	return body.data;
}

async function decideHumanReview(
	reviewId: string,
	decision: "approve" | "reject",
): Promise<{ status: string }> {
	const response = await fetch(
		`/api/history/human-reviews/${encodeURIComponent(reviewId)}/decision`,
		{
			method: "POST",
			credentials: "same-origin",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ decision }),
		},
	);
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok || !isDecisionResponse(body)) throw new Error("Unable to decide human review");
	return { status: body.data.status };
}

function isDetailResponse(value: unknown): value is { data: HumanReviewDetail } {
	return Boolean(value && typeof value === "object" && "data" in value);
}

function isDecisionResponse(value: unknown): value is { data: { status: string } } {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	return Boolean(data && typeof data === "object" && "status" in data);
}

function isRecoveryResponse(value: unknown): value is { error: { recoveryUrl: string } } {
	if (!value || typeof value !== "object" || !("error" in value)) return false;
	const error = value.error;
	return Boolean(error && typeof error === "object" && "recoveryUrl" in error);
}

class HumanReviewAuthenticationError extends Error {
	constructor(readonly recoveryUrl: string) {
		super("Reviewer email verification is required");
		this.name = "HumanReviewAuthenticationError";
	}
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
		new Date(value),
	);
}

function terminalStatusMessage(status: string): string {
	if (status === "completed") return "Approved and executed.";
	if (status === "rejected") return "Request rejected. No document action was executed.";
	if (status === "expired") return "This review request expired without execution.";
	if (status === "invalidated") return "This review request was invalidated without execution.";
	if (status === "failed") return "Approval was recorded, but the requested action failed.";
	if (status === "executing") return "Approval was recorded and the requested action is executing.";
	return "This review request is no longer pending.";
}
