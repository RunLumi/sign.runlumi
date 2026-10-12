import { redirectRememberedLogin } from "./remembered-login";

const sessionBoundary = vi.hoisted(() => vi.fn());
vi.mock("@/db/history-access", () => ({ resolveHistorySessionState: sessionBoundary }));

describe("remembered browser login", () => {
	beforeEach(() => {
		sessionBoundary.mockReset();
		sessionBoundary.mockResolvedValue({ state: "active" });
	});

	it.each([
		["/", "/my-documents"],
		["/?task=my-documents", "/my-documents"],
		["/?task=only-me", "/new-document?signingMode=only_me"],
		["/?task=with-someone", "/new-document?signingMode=me_and_another_signer"],
	])("reuses a remembered login at %s", async (path, destination) => {
		const response = await redirectRememberedLogin(
			new Request(`https://sign.runlumi.app${path}`, {
				headers: { cookie: "other=1; signmos_history_session=synthetic-session" },
			}),
		);
		expect(response?.status).toBe(302);
		expect(response?.headers.get("location")).toBe(destination);
		expect(response?.headers.get("cache-control")).toBe("private, no-store");
	});

	it.each([
		"expired",
		"revoked",
		"missing",
	])("leaves %s sessions at the login page", async (state) => {
		sessionBoundary.mockResolvedValue({ state });
		const response = await redirectRememberedLogin(
			new Request("https://sign.runlumi.app/", {
				headers: { cookie: "signmos_history_session=synthetic-session" },
			}),
		);
		expect(response).toBeNull();
	});

	it("does not resolve identity when there is no cookie", async () => {
		expect(await redirectRememberedLogin(new Request("https://sign.runlumi.app/"))).toBeNull();
		expect(sessionBoundary).not.toHaveBeenCalled();
	});
});
