import { IconArrowLeft as ArrowLeft, IconHome as Home } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type React from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/patterns/panel";
import { Button } from "@/components/ui/button";

export function NotFound({ children }: { children?: React.ReactNode }) {
	return (
		<PageShell width="narrow" center>
			<Panel className="space-y-6">
				<PageHeader
					title="Page not found"
					lead={
						children
							? undefined
							: "The page you’re looking for doesn’t exist or has been moved. Check the URL or head back home."
					}
				/>
				{children ? <div className="text-pretty text-muted-foreground">{children}</div> : null}
				<div className="flex flex-col gap-3 sm:flex-row">
					<Button onClick={() => window.history.back()}>
						<ArrowLeft aria-hidden="true" className="size-4" />
						Go back
					</Button>
					<Button variant="outline" asChild>
						<Link to="/">
							<Home aria-hidden="true" className="size-4" />
							Go home
						</Link>
					</Button>
				</div>
			</Panel>
		</PageShell>
	);
}
