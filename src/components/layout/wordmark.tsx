import { Signature } from "lucide-react";
import { cn } from "@/lib/utils";

function WordmarkContent() {
	return (
		<>
			<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
				<Signature aria-hidden="true" className="size-4" />
			</span>
			<span className="font-semibold text-foreground text-sm">Signmos</span>
		</>
	);
}

export function Wordmark({ linked = true, className }: { linked?: boolean; className?: string }) {
	if (!linked) {
		return (
			<span className={cn("inline-flex items-center gap-2", className)}>
				<WordmarkContent />
			</span>
		);
	}
	return (
		<a
			href="/"
			aria-label="Signmos home"
			className={cn(
				"inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
				className,
			)}
		>
			<WordmarkContent />
		</a>
	);
}
