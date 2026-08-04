import type * as React from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "destructive";

const statusTones: Record<StatusTone, string> = {
	neutral: "border-border bg-muted/60 text-muted-foreground",
	info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
	success:
		"border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
	warning:
		"border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
	destructive:
		"border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
};

export function StatusBadge({
	tone = "neutral",
	className,
	children,
	...props
}: React.ComponentProps<"span"> & { tone?: StatusTone }) {
	return (
		<span
			data-slot="status-badge"
			className={cn(
				"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-medium text-xs",
				statusTones[tone],
				className,
			)}
			{...props}
		>
			<span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
			{children}
		</span>
	);
}
