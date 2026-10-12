import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { AuthenticatedProductNavigation } from "@/components/navigation/product-mode-navigation";
import { EmptyState } from "@/components/patterns/empty-state";
import { LoadingText } from "@/components/patterns/loading-text";
import { Panel, PanelTitle } from "@/components/patterns/panel";
import { StatusBadge } from "@/components/patterns/status-badge";
import { TextLink } from "@/components/patterns/text-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const agentGuideUrl = "https://sign.runlumi.app/agent.md";
const openApiUrl = "https://sign.runlumi.app/openapi.json";
const tokenQueryKey = ["agentic-tokens"] as const;
type PromptTokenSource = "environment" | "generated" | "saved";

interface AgenticTokenMetadata {
	id: string;
	name: string;
	hint: string;
	createdAt: string;
	lastUsedAt: string | null;
	status: "active" | "revoked";
	revokedAt: string | null;
}

interface TokenListingResponse {
	data: { activeLimit: number; tokens: AgenticTokenMetadata[] };
}

interface TokenGenerationResponse {
	data: {
		secret: string;
		token: { id: string; name: string; hint: string; createdAt: string };
	};
}

class AgenticConsoleError extends Error {
	constructor(
		readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "AgenticConsoleError";
	}
}

export function AgenticTokenConsole() {
	const queryClient = useQueryClient();
	const [copyStatus, setCopyStatus] = useState("");
	const [promptTokenSource, setPromptTokenSource] = useState<PromptTokenSource>("environment");
	const [savedPromptToken, setSavedPromptToken] = useState("");
	const [pendingRevoke, setPendingRevoke] = useState<AgenticTokenMetadata | null>(null);
	const listing = useQuery({
		queryKey: tokenQueryKey,
		queryFn: async () => {
			const response = await fetch("/api/agentic/tokens", { credentials: "same-origin" });
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok || !isTokenListingResponse(body)) {
				throw consoleError(body, "Unable to load Agentic tokens");
			}
			return body.data;
		},
	});
	const generation = useMutation({
		mutationFn: async (input: { name: string; acknowledgeFullAuthority: true }) => {
			const response = await fetch("/api/agentic/tokens", {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(input),
			});
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok || !isTokenGenerationResponse(body)) {
				throw consoleError(body, "Unable to generate Agentic token");
			}
			return body.data;
		},
		onSuccess: () => {
			setPromptTokenSource("generated");
			return queryClient.invalidateQueries({ queryKey: tokenQueryKey });
		},
	});
	const revocation = useMutation({
		mutationFn: async (token: AgenticTokenMetadata) => {
			const response = await fetch(`/api/agentic/tokens/${token.id}`, {
				method: "DELETE",
				credentials: "same-origin",
			});
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok) throw consoleError(body, `Unable to revoke ${token.name}`);
			return token.id;
		},
		onSuccess: async () => {
			setPendingRevoke(null);
			await queryClient.invalidateQueries({ queryKey: tokenQueryKey });
		},
	});
	const form = useForm({
		defaultValues: { name: "", acknowledgeFullAuthority: false },
		onSubmit: ({ value }) => {
			if (!value.acknowledgeFullAuthority) return;
			generation.mutate({
				name: value.name.trim(),
				acknowledgeFullAuthority: true,
			});
		},
	});
	const activeCount = listing.data?.tokens.filter((token) => token.status === "active").length ?? 0;
	const atLimit = listing.data ? activeCount >= listing.data.activeLimit : true;
	const agentPrompt = buildAgentPrompt(
		resolvePromptToken(promptTokenSource, generation.data?.secret, savedPromptToken),
	);

	async function copy(value: string, successMessage: string) {
		try {
			await navigator.clipboard.writeText(value);
			setCopyStatus(successMessage);
		} catch {
			setCopyStatus("Copy failed. Select and copy the text manually.");
		}
	}

	return (
		<>
			<PageShell width="content">
				<AuthenticatedProductNavigation activeMode="agentic" />
				<PageHeader
					title="Create an Agentic token"
					lead="Anyone holding this token can send, sign, decline, cancel, and delete documents as your verified email. Sign, decline, cancel, expire, and delete requests still require the matching human to approve the exact action in Lumi Sign before it runs."
				/>

				<TokenListing listing={listing} onRevoke={setPendingRevoke} />

				<Panel
					as="form"
					aria-label="Generate Agentic token"
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="agentic-token-name">Token name</Label>
								<Input
									id="agentic-token-name"
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									required
									disabled={atLimit}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="acknowledgeFullAuthority">
						{(field) => (
							<label className="flex items-start gap-3 text-foreground text-sm">
								<input
									type="checkbox"
									name={field.name}
									checked={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.checked)}
									required
									disabled={atLimit}
									className="mt-0.5 size-4 rounded border-input"
								/>
								<span>
									I understand this token can send, sign, decline, cancel, and delete as my verified
									email.
								</span>
							</label>
						)}
					</form.Field>
					<Button type="submit" disabled={generation.isPending || atLimit}>
						{generation.isPending ? "Generating…" : "Generate token"}
					</Button>
					{atLimit && listing.data ? (
						<p className="text-muted-foreground text-sm">Revoke a token to create another.</p>
					) : null}
				</Panel>

				{generation.isError ? (
					<Alert role="alert" variant="destructive">
						<AlertTitle>Token generation failed</AlertTitle>
						<AlertDescription>{generation.error.message}</AlertDescription>
					</Alert>
				) : null}

				{generation.data ? (
					<Alert role="status">
						<AlertTitle>Copy this token now</AlertTitle>
						<AlertDescription className="space-y-3">
							<p>This secret is shown once and cannot be recovered after this page reloads.</p>
							<code className="block wrap-anywhere rounded-md bg-muted p-3 font-mono text-sm">
								{generation.data.secret}
							</code>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									copy(`export SIGNMOS_TOKEN='${generation.data.secret}'`, "Token setup copied.")
								}
							>
								Copy token setup
							</Button>
						</AlertDescription>
					</Alert>
				) : null}

				<Panel aria-labelledby="agent-prompt-title" className="space-y-4">
					<PanelTitle id="agent-prompt-title">Agent prompt</PanelTitle>
					<fieldset className="space-y-2 rounded-md border p-4">
						<legend className="px-1 font-medium text-sm">Token used in Agent prompt</legend>
						<label className="flex items-start gap-3 text-foreground text-sm">
							<input
								type="radio"
								name="agent-prompt-token-source"
								checked={promptTokenSource === "environment"}
								onChange={() => setPromptTokenSource("environment")}
								className="mt-0.5 size-4 border-input"
							/>
							<span>Use environment variable ($SIGNMOS_TOKEN)</span>
						</label>
						{generation.data ? (
							<label className="flex items-start gap-3 text-foreground text-sm">
								<input
									type="radio"
									name="agent-prompt-token-source"
									checked={promptTokenSource === "generated"}
									onChange={() => setPromptTokenSource("generated")}
									className="mt-0.5 size-4 border-input"
								/>
								<span>Use {generation.data.token.name}</span>
							</label>
						) : (
							<p className="text-muted-foreground text-sm">
								Generate a new token to select its one-time secret here.
							</p>
						)}
						<label className="flex items-start gap-3 text-foreground text-sm">
							<input
								type="radio"
								name="agent-prompt-token-source"
								checked={promptTokenSource === "saved"}
								onChange={() => setPromptTokenSource("saved")}
								className="mt-0.5 size-4 border-input"
							/>
							<span>Use a saved full token</span>
						</label>
						<div className="space-y-2 pl-7">
							<Label htmlFor="agent-prompt-full-token">Full token</Label>
							<Input
								id="agent-prompt-full-token"
								type="password"
								autoComplete="off"
								spellCheck={false}
								value={savedPromptToken}
								onChange={(event) => {
									setSavedPromptToken(event.target.value);
									setPromptTokenSource("saved");
								}}
							/>
							<p className="text-muted-foreground text-sm">
								Existing tokens cannot be recovered from Lumi Sign. Paste the full token you saved,
								or generate a new token above.
							</p>
						</div>
					</fieldset>
					<pre
						data-testid="agent-prompt"
						className="wrap-anywhere whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-muted-foreground text-sm"
					>
						{agentPrompt}
					</pre>
					<nav aria-label="Agent API resources" className="flex flex-wrap gap-4 text-sm">
						<TextLink href={agentGuideUrl}>Open Agent guide</TextLink>
						<TextLink href={openApiUrl}>OpenAPI schema</TextLink>
					</nav>
					<Button
						type="button"
						variant="outline"
						onClick={() => copy(agentPrompt, "Agent prompt copied.")}
					>
						Copy agent prompt
					</Button>
				</Panel>
				{copyStatus ? <LoadingText>{copyStatus}</LoadingText> : null}
			</PageShell>

			<Dialog
				open={pendingRevoke !== null}
				onOpenChange={(open) => {
					if (!open) setPendingRevoke(null);
				}}
			>
				<DialogContent role="alertdialog">
					<DialogHeader>
						<DialogTitle>Revoke {pendingRevoke?.name}?</DialogTitle>
						<DialogDescription>
							This token will stop working immediately. Your other tokens remain active.
						</DialogDescription>
					</DialogHeader>
					{revocation.isError ? (
						<p role="alert" className="text-destructive text-sm">
							{revocation.error.message}
						</p>
					) : null}
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="button"
							variant="destructive"
							disabled={revocation.isPending}
							onClick={() => {
								if (pendingRevoke) revocation.mutate(pendingRevoke);
							}}
						>
							{revocation.isPending ? "Revoking…" : "Confirm revoke"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function resolvePromptToken(
	source: PromptTokenSource,
	generatedToken: string | undefined,
	savedToken: string,
): string | undefined {
	if (source === "generated") return generatedToken;
	if (source === "saved") return savedToken.trim() || undefined;
	return undefined;
}

function buildAgentPrompt(secret: string | undefined): string {
	const token = secret ?? "$SIGNMOS_TOKEN";
	return `Read ${agentGuideUrl} and ${openApiUrl}. Use ${token} only in the Authorization Bearer header. Confirm the verified identity before acting, remain within the user's stated goal, and never place the token in URLs, logs, issues, or source control. Sign/complete, decline, cancel, expire, and delete return pending human review: tell the user, poll the returned command URL, and never claim execution before a completed terminal result.`;
}

function TokenListing({
	listing,
	onRevoke,
}: {
	listing: ReturnType<typeof useQuery<{ activeLimit: number; tokens: AgenticTokenMetadata[] }>>;
	onRevoke: (token: AgenticTokenMetadata) => void;
}) {
	if (listing.isPending) return <LoadingText>Loading Agentic tokens…</LoadingText>;
	if (listing.isError) {
		const expired =
			listing.error instanceof AgenticConsoleError &&
			["AGENTIC_MANAGEMENT_SESSION_EXPIRED", "AGENTIC_MANAGEMENT_SESSION_REQUIRED"].includes(
				listing.error.code,
			);
		return (
			<Alert role="alert" variant="destructive">
				<AlertTitle>
					{expired ? "Agentic management session expired" : "Unable to load Agentic tokens"}
				</AlertTitle>
				<AlertDescription>
					{expired ? (
						<TextLink href="/?task=agentic">Verify email again</TextLink>
					) : (
						"Retry or verify your connection."
					)}
				</AlertDescription>
			</Alert>
		);
	}
	const activeCount = listing.data.tokens.filter((token) => token.status === "active").length;
	return (
		<Panel aria-labelledby="agentic-token-list-title" className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<PanelTitle id="agentic-token-list-title">Your Agentic tokens</PanelTitle>
				<p className="font-medium text-sm tabular-nums">
					{activeCount} of {listing.data.activeLimit} active
				</p>
			</div>
			{listing.data.tokens.length === 0 ? (
				<EmptyState
					title="No Agentic tokens yet"
					description="Generate a token below to connect your agent."
				/>
			) : (
				<ul className="space-y-3">
					{listing.data.tokens.map((token) => (
						<TokenListItem key={token.id} token={token} onRevoke={onRevoke} />
					))}
				</ul>
			)}
		</Panel>
	);
}

function TokenListItem({
	token,
	onRevoke,
}: {
	token: AgenticTokenMetadata;
	onRevoke: (token: AgenticTokenMetadata) => void;
}) {
	const active = token.status === "active";
	return (
		<li className="space-y-2 rounded-lg border bg-card p-4">
			<h3 className="flex flex-wrap items-center gap-2 font-medium">
				{token.name}
				<StatusBadge tone={active ? "success" : "destructive"}>
					{active ? "Active" : "Revoked"}
				</StatusBadge>
			</h3>
			<code className="font-mono text-muted-foreground text-sm">{token.hint}</code>
			<p className="text-muted-foreground text-sm tabular-nums">
				Created {formatDate(token.createdAt)}
			</p>
			<p className="text-muted-foreground text-sm tabular-nums">
				{token.lastUsedAt ? `Last used ${formatDate(token.lastUsedAt)}` : "Never used"}
			</p>
			{active ? (
				<Button type="button" variant="outline" onClick={() => onRevoke(token)}>
					Revoke {token.name}
				</Button>
			) : token.revokedAt ? (
				<p className="text-muted-foreground text-sm tabular-nums">
					Revoked {formatDate(token.revokedAt)}
				</p>
			) : null}
		</li>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
		new Date(value),
	);
}

function consoleError(value: unknown, fallback: string): AgenticConsoleError {
	if (value && typeof value === "object" && "error" in value) {
		const error = value.error;
		if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
			const message =
				"message" in error && typeof error.message === "string" ? error.message : fallback;
			return new AgenticConsoleError(error.code, message);
		}
	}
	return new AgenticConsoleError("UNKNOWN", fallback);
}

function isTokenListingResponse(value: unknown): value is TokenListingResponse {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	return Boolean(
		data &&
			typeof data === "object" &&
			"activeLimit" in data &&
			typeof data.activeLimit === "number" &&
			"tokens" in data &&
			Array.isArray(data.tokens),
	);
}

function isTokenGenerationResponse(value: unknown): value is TokenGenerationResponse {
	if (!value || typeof value !== "object" || !("data" in value)) return false;
	const data = value.data;
	return Boolean(data && typeof data === "object" && "secret" in data && "token" in data);
}
