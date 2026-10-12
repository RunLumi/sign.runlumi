import type { Icon as LucideIcon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
}: {
	icon?: LucideIcon;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			data-slot="empty-state"
			className={cn(
				"rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center",
				className,
			)}
		>
			{Icon ? (
				<span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
					<Icon aria-hidden="true" className="size-5" />
				</span>
			) : null}
			<p className={cn("font-medium text-foreground", Icon && "mt-3")}>{title}</p>
			{description ? (
				<p className="mx-auto mt-1 max-w-md text-pretty text-muted-foreground text-sm">
					{description}
				</p>
			) : null}
			{action ? <div className="mt-4 flex justify-center">{action}</div> : null}
		</div>
	);
}
