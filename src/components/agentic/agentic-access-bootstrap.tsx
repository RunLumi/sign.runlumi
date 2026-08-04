import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Wordmark } from "@/components/layout/wordmark";
import { LoadingText } from "@/components/patterns/loading-text";
import { AgenticAccessConfirmationPage } from "./agentic-access-confirmation-page";

export function AgenticAccessBootstrap() {
	const [credential, setCredential] = useState("");

	useEffect(() => {
		const rawFragment = window.location.hash.slice(1);
		if (rawFragment) {
			setCredential(decodeFragment(rawFragment));
			window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
		}
	}, []);

	if (!credential) {
		return (
			<PageShell width="narrow">
				<Wordmark />
				<LoadingText boxed>Checking this secure link…</LoadingText>
			</PageShell>
		);
	}
	return <AgenticAccessConfirmationPage credential={credential} />;
}

function decodeFragment(fragment: string): string {
	try {
		return decodeURIComponent(fragment);
	} catch {
		return "";
	}
}
