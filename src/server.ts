// DO NOT DELETE THIS FILE!!!
// Custom CF Workers entry: routes JSON/public Agent contracts to Hono, rest to TanStack Start
import handler from "@tanstack/react-start/server-entry";
import { withDatabase } from "@/db";
import { apiHono } from "@/hono/api";
import { publicAgentContractHono } from "@/hono/public-agent-contract";
import { redirectRememberedLogin } from "@/hono/remembered-login";

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return withDatabase(env.DB, async () => {
			const url = new URL(request.url);

			if (url.pathname.startsWith("/api/")) {
				return apiHono.fetch(request, env, ctx);
			}
			if (url.pathname === "/agent.md" || url.pathname === "/openapi.json") {
				return publicAgentContractHono.fetch(request, env, ctx);
			}

			const remembered = await redirectRememberedLogin(request);
			if (remembered) return remembered;
			return handler.fetch(request, {
				context: {
					fromFetch: true,
					turnstileSiteKey: env.TURNSTILE_DISABLED === "true" ? "disabled" : env.TURNSTILE_SITE_KEY,
				},
			});
		});
	},
};
