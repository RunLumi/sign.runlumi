import {
	deliverTransactionalEmail,
	EmailDeliveryError,
	isResendConfigured,
} from "./email-delivery";

const configured = {
	RESEND_API_KEY: "re_configured",
	RESEND_FROM_EMAIL: "signing@signmos.test",
	RESEND_REPLY_TO_EMAIL: "reply@signmos.test",
};

describe("development email delivery fixture", () => {
	it("allows an explicit non-production fallback without weakening production delivery", () => {
		expect(
			isResendConfigured({
				...configured,
				CLOUDFLARE_ENV: "development",
				EMAIL_DELIVERY_TEST_BYPASS: "true",
			}),
		).toBe(false);
		expect(
			isResendConfigured({
				...configured,
				CLOUDFLARE_ENV: "production",
				EMAIL_DELIVERY_TEST_BYPASS: "true",
			}),
		).toBe(true);
	});
});

describe("Cloudflare transactional email", () => {
	it("uses the Worker binding with text, HTML, sender, and reply-to", async () => {
		const send = vi.fn().mockResolvedValue({ messageId: "cloudflare-message" });
		const env = {
			EMAIL: { send },
			EMAIL_FROM: "Lumi Sign <sign@runlumi.app>",
			EMAIL_REPLY_TO: "sign@runlumi.app",
		};
		const email = {
			to: "controlled@example.com",
			subject: "Verify",
			text: "Verify your email",
			html: "<p>Verify your email</p>",
		};
		expect(isResendConfigured(env)).toBe(true);
		await expect(
			deliverTransactionalEmail(email, { env, baseUrl: "https://sign.runlumi.app" }),
		).resolves.toEqual({ providerMessage: "cloudflare-message" });
		expect(send).toHaveBeenCalledWith({
			...email,
			from: env.EMAIL_FROM,
			replyTo: env.EMAIL_REPLY_TO,
		});
	});
	it("reports provider failure instead of recording a successful delivery", async () => {
		const send = vi.fn().mockRejectedValue(new Error("provider denied"));
		await expect(
			deliverTransactionalEmail(
				{ to: "controlled@example.com", subject: "Verify", text: "Verify", html: "<p>Verify</p>" },
				{
					env: { EMAIL: { send }, EMAIL_FROM: "sign@runlumi.app" },
					baseUrl: "https://sign.runlumi.app",
				},
			),
		).rejects.toBeInstanceOf(EmailDeliveryError);
	});
});
