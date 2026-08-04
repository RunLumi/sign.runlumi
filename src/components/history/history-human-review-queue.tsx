import { useQuery } from "@tanstack/react-query";
import { Panel, PanelDescription, PanelTitle } from "@/components/patterns/panel";
import { StatusBadge } from "@/components/patterns/status-badge";
import { TextLink } from "@/components/patterns/text-link";

interface HumanReviewQueueItem {
	commandId: string;
	documentId: string;
	title: string;
	actionLabel: string;
	agentName: string;
	status: "pending_human_review";
	expiresAt: string;
	reviewUrl: string;
}

interface HumanReviewQueueResponse {
	data: { items: HumanReviewQueueItem[] };
}

export function HistoryHumanReviewQueue() {
	const queue = useQuery({
		queryKey: ["history-human-reviews"],
		queryFn: fetchHumanReviewQueue,
	});
	if (!queue.data || queue.data.length === 0) return null;
	return (
		<Panel className="space-y-3">
			<div className="flex flex-wrap items-center gap-3">
				<PanelTitle>Pending human reviews</PanelTitle>
				<StatusBadge tone="warning">Action needed</StatusBadge>
			</div>
			<PanelDescription>
				These agent-requested actions will not run until you explicitly approve them.
			</PanelDescription>
			<ul className="space-y-3">
				{queue.data.map((item) => (
					<li key={item.commandId} className="rounded-lg border bg-card p-4">
						<p className="font-medium text-foreground">{item.title}</p>
						<p className="text-muted-foreground text-sm tabular-nums">
							{item.actionLabel} requested by {item.agentName}. Expires {formatDate(item.expiresAt)}
							.
						</p>
						<TextLink className="mt-2 inline-flex" href={item.reviewUrl}>
							Review requested action
						</TextLink>
					</li>
				))}
			</ul>
		</Panel>
	);
}

async function fetchHumanReviewQueue(): Promise<HumanReviewQueueItem[]> {
	const response = await fetch("/api/history/human-reviews", { credentials: "same-origin" });
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok || !isQueueResponse(body)) throw new Error("Unable to load human reviews");
	return body.data.items;
}

function isQueueResponse(value: unknown): value is HumanReviewQueueResponse {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	if (!data || typeof data !== "object" || !("items" in data) || !Array.isArray(data.items)) {
		return false;
	}
	return data.items.every(
		(item) =>
			item &&
			typeof item === "object" &&
			"status" in item &&
			item.status === "pending_human_review" &&
			"reviewUrl" in item &&
			typeof item.reviewUrl === "string" &&
			"expiresAt" in item &&
			typeof item.expiresAt === "string" &&
			!Number.isNaN(new Date(item.expiresAt).getTime()),
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
		new Date(value),
	);
}
