import {
	IconArrowRight as ArrowRight,
	IconBan as Ban,
	IconDownload as Download,
	IconHistory as History,
	IconTrash as Trash2,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/patterns/empty-state";
import { LoadingText } from "@/components/patterns/loading-text";
import { NativeSelect } from "@/components/patterns/native-select";
import { Panel, PanelDescription, PanelTitle } from "@/components/patterns/panel";
import { StatusBadge, type StatusTone } from "@/components/patterns/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type DocumentHistoryState = "draft" | "in_progress" | "completed";
type HistoryFilter = DocumentHistoryState | "all";

interface DocumentHistoryPanelProps {
	envelopeId: string;
	senderSessionToken: string;
}

interface DocumentHistoryResponse {
	email: string;
	windowStart: string;
	windowDays: number;
	documents: DocumentHistoryItem[];
}

interface DocumentHistoryItem {
	envelopeId: string;
	title: string;
	status: string;
	state: DocumentHistoryState;
	documentType: "self_signed" | "signed_with_partner";
	role: string;
	createdAt: string;
	action: DocumentHistoryAction | null;
	creatorActions: DocumentHistoryCreatorAction[];
}

interface DocumentHistoryAction {
	type: "resume" | "completed";
	label: string;
	url: string;
	downloadUrl?: string;
}

interface DocumentHistoryCreatorAction {
	action: "cancel" | "delete";
	label: string;
}

interface PendingCreatorAction {
	envelopeId: string;
	action: "cancel" | "delete";
}

type HistorySuccess = { data: DocumentHistoryResponse };
type HistoryError = { error: { message: string } };

export function DocumentHistoryPanel({
	envelopeId,
	senderSessionToken,
}: DocumentHistoryPanelProps) {
	const [expanded, setExpanded] = useState(false);
	const [filter, setFilter] = useState<HistoryFilter>("all");
	const queryClient = useQueryClient();
	const queryKey = ["document-history", envelopeId, senderSessionToken] as const;
	const historyQuery = useQuery({
		queryKey,
		queryFn: () => fetchDocumentHistory(envelopeId, senderSessionToken),
		enabled: expanded && Boolean(envelopeId && senderSessionToken),
		staleTime: 30_000,
	});
	const controlMutation = useMutation({
		mutationFn: (input: PendingCreatorAction) => runCreatorAction(input, senderSessionToken),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	return (
		<Panel aria-label="Document history">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<PanelTitle className="flex items-center gap-2">
						<History aria-hidden="true" className="size-5 text-muted-foreground" />
						Document history
					</PanelTitle>
					<PanelDescription>
						Documents linked to the confirmed email from the last 30 days.
					</PanelDescription>
				</div>
				<Button type="button" variant="outline" onClick={() => setExpanded((value) => !value)}>
					{expanded ? "Hide document history" : "Show document history"}
				</Button>
			</div>

			{expanded ? (
				<ExpandedDocumentHistory
					data={historyQuery.data ?? null}
					isLoading={historyQuery.isLoading}
					historyError={historyQuery.error}
					controlError={controlMutation.error}
					filter={filter}
					onFilterChange={setFilter}
					pendingAction={controlMutation.variables ?? null}
					isActionPending={controlMutation.isPending}
					onCreatorAction={(input) => controlMutation.mutate(input)}
				/>
			) : null}
		</Panel>
	);
}

function ExpandedDocumentHistory({
	data,
	isLoading,
	historyError,
	controlError,
	filter,
	onFilterChange,
	pendingAction,
	isActionPending,
	onCreatorAction,
}: {
	data: DocumentHistoryResponse | null;
	isLoading: boolean;
	historyError: unknown;
	controlError: unknown;
	filter: HistoryFilter;
	onFilterChange: (value: HistoryFilter) => void;
	pendingAction: PendingCreatorAction | null;
	isActionPending: boolean;
	onCreatorAction: (input: PendingCreatorAction) => void;
}) {
	const documents = data?.documents ?? [];
	const visibleDocuments =
		filter === "all" ? documents : documents.filter((document) => document.state === filter);
	const historyMessage = historyError instanceof Error ? historyError.message : null;
	const controlMessage = controlError instanceof Error ? controlError.message : null;

	return (
		<div className="mt-5 space-y-4">
			{isLoading ? <LoadingText>Loading document history…</LoadingText> : null}
			{historyMessage ? (
				<HistoryErrorAlert title="History failed" message={historyMessage} />
			) : null}
			{controlMessage ? (
				<HistoryErrorAlert title="History action failed" message={controlMessage} />
			) : null}
			{data ? (
				<>
					<HistoryFilterControl value={filter} onChange={onFilterChange} />
					<DocumentHistoryTable
						documents={visibleDocuments}
						pendingAction={pendingAction}
						isActionPending={isActionPending}
						onCreatorAction={onCreatorAction}
					/>
				</>
			) : null}
		</div>
	);
}

function HistoryErrorAlert({ title, message }: { title: string; message: string }) {
	return (
		<Alert variant="destructive" role="alert">
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

function HistoryFilterControl({
	value,
	onChange,
}: {
	value: HistoryFilter;
	onChange: (value: HistoryFilter) => void;
}) {
	return (
		<div className="flex flex-col gap-2 sm:max-w-64">
			<Label htmlFor="document-history-filter">State</Label>
			<NativeSelect
				id="document-history-filter"
				aria-label="Filter document history by state"
				value={value}
				onChange={(event) => onChange(event.target.value as HistoryFilter)}
			>
				<option value="all">All states</option>
				<option value="draft">Draft</option>
				<option value="in_progress">In progress</option>
				<option value="completed">Completed</option>
			</NativeSelect>
		</div>
	);
}

function DocumentHistoryTable({
	documents,
	pendingAction,
	isActionPending,
	onCreatorAction,
}: {
	documents: DocumentHistoryItem[];
	pendingAction: PendingCreatorAction | null;
	isActionPending: boolean;
	onCreatorAction: (input: PendingCreatorAction) => void;
}) {
	if (documents.length === 0) {
		return <EmptyState icon={History} title="No documents match this filter." />;
	}

	return (
		<Table className="min-w-[720px]" aria-label="Confirmed email document history">
			<TableHeader>
				<TableRow>
					<TableHead>Document</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>State</TableHead>
					<TableHead>Created</TableHead>
					<TableHead>Action</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{documents.map((document) => (
					<TableRow key={document.envelopeId}>
						<TableCell className="py-3 align-top">
							<p className="font-medium">{document.title}</p>
							<p className="text-muted-foreground text-xs">{formatRole(document.role)}</p>
						</TableCell>
						<TableCell className="py-3 align-top">
							{formatDocumentType(document.documentType)}
						</TableCell>
						<TableCell className="py-3 align-top">
							<StatusBadge tone={documentStatusTone(document.status)}>
								{document.status}
							</StatusBadge>
						</TableCell>
						<TableCell className="py-3 align-top">
							<time className="tabular-nums" dateTime={document.createdAt}>
								{formatDate(document.createdAt)}
							</time>
						</TableCell>
						<TableCell className="py-3 align-top">
							<DocumentHistoryActions
								document={document}
								pendingAction={pendingAction}
								isActionPending={isActionPending}
								onCreatorAction={onCreatorAction}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function documentStatusTone(status: string): StatusTone {
	if (status === "completed") return "success";
	if (status === "declined") return "destructive";
	if (
		status === "sent" ||
		status === "in_progress" ||
		status.startsWith("awaiting") ||
		status.startsWith("pending")
	) {
		return "warning";
	}
	return "neutral";
}

function DocumentHistoryActions({
	document,
	pendingAction,
	isActionPending,
	onCreatorAction,
}: {
	document: DocumentHistoryItem;
	pendingAction: PendingCreatorAction | null;
	isActionPending: boolean;
	onCreatorAction: (input: PendingCreatorAction) => void;
}) {
	const { action } = document;
	const hasActions = Boolean(action || document.creatorActions.length > 0);
	if (!hasActions) {
		return <span className="text-muted-foreground text-sm">No action available</span>;
	}
	return (
		<div className="flex flex-wrap gap-2">
			{action ? (
				<Button asChild size="sm">
					<a href={action.url}>
						{action.label}
						<ArrowRight aria-hidden="true" className="size-4" />
					</a>
				</Button>
			) : null}
			{action?.type === "completed" && action.downloadUrl ? (
				<Button asChild size="sm" variant="outline">
					<a href={action.downloadUrl}>
						<Download aria-hidden="true" className="size-4" />
						Download PDF
					</a>
				</Button>
			) : null}
			{document.creatorActions.map((creatorAction) => (
				<Button
					key={creatorAction.action}
					type="button"
					size="sm"
					variant="outline"
					aria-label={`${creatorAction.label} ${document.title}`}
					disabled={
						isActionPending &&
						pendingAction?.envelopeId === document.envelopeId &&
						pendingAction.action === creatorAction.action
					}
					onClick={() =>
						onCreatorAction({
							envelopeId: document.envelopeId,
							action: creatorAction.action,
						})
					}
				>
					{creatorAction.action === "cancel" ? (
						<Ban aria-hidden="true" className="size-4" />
					) : (
						<Trash2 aria-hidden="true" className="size-4" />
					)}
					{creatorAction.label}
				</Button>
			))}
		</div>
	);
}

async function fetchDocumentHistory(
	envelopeId: string,
	senderSessionToken: string,
): Promise<DocumentHistoryResponse> {
	const response = await fetch(`/api/envelopes/${envelopeId}/history`, {
		headers: { "x-sender-session-token": senderSessionToken },
	});
	const json: unknown = await response.json().catch(() => null);
	if (!response.ok || !isHistorySuccess(json)) {
		const message = isHistoryError(json) ? json.error.message : "Unable to load document history";
		throw new Error(message);
	}
	return json.data;
}

async function runCreatorAction(
	input: PendingCreatorAction,
	senderSessionToken: string,
): Promise<void> {
	const response = await fetch(`/api/envelopes/${input.envelopeId}/actions`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-sender-session-token": senderSessionToken,
		},
		body: JSON.stringify({ action: input.action }),
	});
	const json: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		const message = isHistoryError(json) ? json.error.message : "Unable to update this envelope";
		throw new Error(message);
	}
}

function formatDocumentType(type: DocumentHistoryItem["documentType"]): string {
	return type === "self_signed" ? "Self-signed" : "Signed with partner";
}

function formatRole(role: string): string {
	if (role === "creator_and_signer") return "Creator and signer";
	if (role === "creator") return "Creator";
	return "Signer";
}

function formatDate(value: string): string {
	return value.slice(0, 10);
}

function isHistorySuccess(value: unknown): value is HistorySuccess {
	if (!isRecord(value) || !isRecord(value.data)) return false;
	return Array.isArray(value.data.documents);
}

function isHistoryError(value: unknown): value is HistoryError {
	if (!isRecord(value) || !isRecord(value.error)) return false;
	return typeof value.error.message === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object");
}
