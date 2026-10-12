import { Hono } from "hono";
import { rememberVerifiedSenderLogin } from "./remember-sender-login";

const boundary = vi.hoisted(() => ({ create: vi.fn(), resolve: vi.fn() }));
vi.mock("@/db/history-access", () => ({
	createHistorySessionFromVerifiedIdentity: boundary.create,
	resolveHistorySessionState: boundary.resolve,
	historySessionTtlSeconds: 604800,
}));

describe("remembering a verified sender", () => {
	const app = new Hono<{ Bindings: Env }>();
	const now = new Date("2026-10-12T08:00:00Z");
	app.get("/verified", async (c) => {
		await rememberVerifiedSenderLogin(c, "owner@example.com", now);
		return c.json({ data: { verified: true } });
	});
	beforeEach(() => {
		boundary.create.mockReset();
		boundary.resolve.mockReset();
		boundary.resolve.mockResolvedValue({ state: "missing" });
		boundary.create.mockResolvedValue({
			rawSession: "synthetic-session",
			expiresAt: new Date("2026-10-19T08:00:00Z"),
		});
	});
	it("persists a secure seven-day cookie after browser verification", async () => {
		const response = await app.request("https://sign.runlumi.app/verified", {
			headers: { "x-remember-sign-in": "true" },
		});
		const cookie = response.headers.get("set-cookie");
		expect(cookie).toContain("Max-Age=604800");
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Secure");
		expect(cookie).toContain("SameSite=Lax");
		expect(boundary.create).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "owner@example.com",
				verifiedUntil: new Date("2026-10-19T08:00:00Z"),
			}),
		);
	});
	it("does not create a session for ordinary link inspection", async () => {
		const response = await app.request("https://sign.runlumi.app/verified");
		expect(response.headers.get("set-cookie")).toBeNull();
		expect(boundary.create).not.toHaveBeenCalled();
	});
	it("does not extend an existing active login for the same email", async () => {
		boundary.resolve.mockResolvedValue({
			state: "active",
			session: { email: "owner@example.com" },
		});
		const response = await app.request("https://sign.runlumi.app/verified", {
			headers: {
				"x-remember-sign-in": "true",
				cookie: "signmos_history_session=synthetic-session",
			},
		});
		expect(response.headers.get("set-cookie")).toBeNull();
		expect(boundary.create).not.toHaveBeenCalled();
	});
});
