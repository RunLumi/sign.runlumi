import type { ReactNode } from "react";
import { Wordmark } from "@/components/layout/wordmark";
import { cn } from "@/lib/utils";

const shellWidths = { narrow: "max-w-xl", content: "max-w-3xl", wide: "max-w-[1200px]" } as const;
export type PageShellWidth = keyof typeof shellWidths;

export function PageShell({
	width = "content",
	center = false,
	className,
	children,
}: {
	width?: PageShellWidth;
	center?: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex min-h-dvh flex-col bg-background">
			<a
				href="#main-content"
				className="sr-only z-20 bg-card p-3 text-primary focus:not-sr-only focus:absolute"
			>
				Skip to content
			</a>
			<header className="px-5 pt-5 sm:px-10 sm:pt-6">
				<div className="lumi-glass mx-auto flex max-w-[1200px] items-center justify-between gap-3 rounded-2xl px-3 py-2 sm:px-5">
					<Wordmark />
					<nav aria-label="Document navigation">
						<a
							href="/api/navigate/my_documents"
							aria-label="Open My documents"
							className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-primary text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
						>
							My documents
						</a>
					</nav>
				</div>
			</header>
			<main
				id="main-content"
				tabIndex={-1}
				className={cn(
					"flex-1 px-5 py-10 outline-none sm:px-10 sm:py-16",
					center && "flex items-center",
					className,
				)}
			>
				<div className={cn("mx-auto w-full min-w-0 space-y-8", shellWidths[width])}>{children}</div>
			</main>
			<footer className="px-5 pb-6 sm:px-10">
				<div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 border-t pt-5 text-muted-foreground text-xs">
					<p>Lumi Sign · PDF signing, with a clear record.</p>
					<a
						href="https://runlumi.app"
						className="rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
					>
						Part of Lumi ↗
					</a>
				</div>
			</footer>
		</div>
	);
}

export function PageHeader({
	title,
	lead,
	wordmark = false,
	align = "start",
	className,
}: {
	title: ReactNode;
	lead?: ReactNode;
	wordmark?: boolean;
	align?: "start" | "center";
	className?: string;
}) {
	return (
		<header className={cn("space-y-4", align === "center" && "text-center", className)}>
			{wordmark ? <Wordmark /> : null}
			<div className="space-y-4">
				<h1 className="text-balance font-semibold text-3xl leading-[1.14] tracking-tight sm:text-[42px]">
					{title}
				</h1>
				{lead ? (
					<p
						className={cn(
							"max-w-xl text-pretty text-muted-foreground leading-7",
							align === "center" && "mx-auto",
						)}
					>
						{lead}
					</p>
				) : null}
			</div>
		</header>
	);
}
