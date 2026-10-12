import {
	IconAlertTriangle as AlertTriangle,
	IconArrowLeft as ArrowLeft,
	IconBug as Bug,
	IconChevronDown as ChevronDown,
	IconHome as Home,
	IconMail as Mail,
	IconRefresh as RefreshCw,
} from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/patterns/panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	const router = useRouter();
	const isRoot = useMatch({
		strict: false,
		select: (state) => state.id === rootRouteId,
	});
	const [showDetails, setShowDetails] = useState(false);

	useEffect(() => {
		// biome-ignore lint/suspicious/noConsole: surface route errors for debugging
		console.error(error);
	}, [error]);

	// Format error details for display
	const errorMessage = error?.message || "An unexpected error occurred";
	const errorStack = error?.stack || "";
	const hasStack = errorStack.length > 0;

	const handleReportError = () => {
		const subject = encodeURIComponent("Error report");
		const body = encodeURIComponent(
			`An error occurred in the application:\n\nError: ${errorMessage}\n\nStack trace:\n${errorStack}\n\nPlease describe what you were doing when this error occurred:`,
		);
		window.location.href = `mailto:sign@runlumi.app?subject=${subject}&body=${body}`;
	};

	return (
		<PageShell width="narrow" center>
			<Panel className="space-y-6">
				<PageHeader
					title="Something went wrong"
					lead="We encountered an unexpected error. Please try again."
				/>

				<Alert variant="destructive">
					<AlertTriangle aria-hidden="true" className="size-4" />
					<AlertDescription className="font-medium">{errorMessage}</AlertDescription>
				</Alert>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Button onClick={() => router.invalidate()}>
						<RefreshCw aria-hidden="true" className="size-4" />
						Try again
					</Button>

					{isRoot ? (
						<Button variant="outline" asChild>
							<Link to="/">
								<Home aria-hidden="true" className="size-4" />
								Go home
							</Link>
						</Button>
					) : (
						<Button variant="outline" onClick={() => window.history.back()}>
							<ArrowLeft aria-hidden="true" className="size-4" />
							Go back
						</Button>
					)}
				</div>

				{hasStack && (
					<Collapsible open={showDetails} onOpenChange={setShowDetails}>
						<CollapsibleTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-foreground"
							>
								<Bug aria-hidden="true" className="size-4" />
								Technical details
								<ChevronDown
									aria-hidden="true"
									className={cn("size-4 transition-transform", showDetails && "rotate-180")}
								/>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="space-y-2">
							<div className="rounded-md bg-muted p-3">
								<p className="mb-2 font-medium text-sm">Error stack trace</p>
								<pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-muted-foreground text-xs">
									{errorStack}
								</pre>
							</div>
						</CollapsibleContent>
					</Collapsible>
				)}

				<div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
					<p className="text-muted-foreground text-sm">
						If this error persists, please report it to our support team.
					</p>
					<Button variant="outline" size="sm" onClick={handleReportError}>
						<Mail aria-hidden="true" className="size-4" />
						Report error
					</Button>
				</div>
			</Panel>
		</PageShell>
	);
}
