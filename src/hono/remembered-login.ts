import { resolveHistorySessionState } from "@/db/history-access";

/** Use the remembered browser identity when returning to the public chooser. */
export async function redirectRememberedLogin(
	request: Request,
	now = new Date(),
): Promise<Response | null> {
	const url = new URL(request.url);
	if (request.method !== "GET" || url.pathname !== "/") return null;
	const rawSession = request.headers
		.get("cookie")
		?.match(/(?:^|;\s*)signmos_history_session=([^;]*)/)?.[1];
	if (!rawSession) return null;
	const state = await resolveHistorySessionState(rawSession, now);
	if (state.state !== "active") return null;
	const returnTo = url.searchParams.get("returnTo");
	const destination =
		returnTo && /^\/human-review\/[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(returnTo)
			? returnTo
			: destinationForTask(url.searchParams.get("task"));
	return new Response(null, {
		status: 302,
		headers: { location: destination, "cache-control": "private, no-store" },
	});
}

function destinationForTask(task: string | null): string {
	if (task === "only-me") return "/new-document?signingMode=only_me";
	if (task === "with-someone") return "/new-document?signingMode=me_and_another_signer";
	if (task === "agentic") return "/api/navigate/agentic";
	return "/my-documents";
}
