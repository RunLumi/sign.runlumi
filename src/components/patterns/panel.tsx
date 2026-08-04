import type * as React from "react";
import { cn } from "@/lib/utils";

/** The one surface style for form/content panels across the app. */
const panelClass = "rounded-xl border bg-card p-5 shadow-xs sm:p-6";

type PanelProps<T extends React.ElementType> = {
	as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, "as">;

export function Panel<T extends React.ElementType = "section">({
	as,
	className,
	...props
}: PanelProps<T>) {
	const Comp = (as ?? "section") as React.ElementType;
	return <Comp data-slot="panel" className={cn(panelClass, className)} {...props} />;
}

export function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
	return (
		<h2
			data-slot="panel-title"
			className={cn("text-balance font-semibold text-foreground text-lg", className)}
			{...props}
		/>
	);
}

export function PanelDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="panel-description"
			className={cn("text-pretty text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}
