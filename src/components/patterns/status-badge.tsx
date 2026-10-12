import type * as React from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "destructive";

const statusTones: Record<StatusTone, string> = {
	neutral: "border-border bg-muted/60 text-muted-foreground",
	info: "border-primary/20 bg-accent text-primary",
	success: "border-success/20 bg-success-soft text-success",
	warning: "border-warning/40 bg-warning-soft text-civic-navy",
	destructive: "border-destructive/20 bg-risk-soft text-destructive",
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
