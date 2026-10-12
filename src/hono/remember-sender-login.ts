import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
	createHistorySessionFromVerifiedIdentity,
	historySessionTtlSeconds,
	resolveHistorySessionState,
} from "@/db/history-access";

/** Remember an identity only after the app has verified the sender's email link. */
export async function rememberVerifiedSenderLogin(
	c: Context<{ Bindings: Env }>,
	email: string,
	now: Date,
): Promise<void> {
	if (c.req.header("x-remember-sign-in") !== "true") return;
	const current = await resolveHistorySessionState(
		getCookie(c, "signmos_history_session") ?? "",
		now,
	);
	if (current.state === "active" && current.session.email === email.trim().toLowerCase()) return;
	const session = await createHistorySessionFromVerifiedIdentity({
		email,
		now,
		verifiedUntil: new Date(now.getTime() + historySessionTtlSeconds * 1000),
	});
	setCookie(c, "signmos_history_session", session.rawSession, {
		path: "/",
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		expires: session.expiresAt,
		maxAge: historySessionTtlSeconds,
	});
	c.header("Cache-Control", "private, no-store");
}
