import type { ReactNode } from "react";
import { Wordmark } from "@/components/layout/wordmark";
import { cn } from "@/lib/utils";

const shellWidths = {
	narrow: "max-w-xl",
	content: "max-w-3xl",
	wide: "max-w-5xl",
} as const;

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
		<main
			className={cn(
				"min-h-dvh bg-background px-4 py-10 sm:px-6 sm:py-14",
				center && "flex items-center",
				className,
			)}
		>
			<div className={cn("mx-auto w-full space-y-8", shellWidths[width])}>{children}</div>
		</main>
	);
}

export function PageHeader({
	title,
	lead,
	wordmark = true,
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
			<div className="space-y-3">
				<h1 className="text-balance font-semibold text-3xl text-foreground">{title}</h1>
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
