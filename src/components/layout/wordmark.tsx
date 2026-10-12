import { cn } from "@/lib/utils";

function WordmarkContent() {
	return (
		<>
			<img src="/brand/lumi-logo.svg" width={40} height={40} alt="" aria-hidden="true" />
			<span className="font-semibold text-civic-navy text-lg tracking-tight sm:text-xl">
				Lumi Sign
			</span>
		</>
	);
}

export function Wordmark({ linked = true, className }: { linked?: boolean; className?: string }) {
	const classes = cn("inline-flex shrink-0 items-center gap-1 rounded-sm", className);
	if (!linked)
		return (
			<span className={classes}>
				<WordmarkContent />
			</span>
		);
	return (
		<a
			href="/"
			aria-label="Lumi Sign home"
			className={cn(
				classes,
				"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4",
			)}
		>
			<WordmarkContent />
		</a>
	);
}
