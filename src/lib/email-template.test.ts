import { renderBrandedEmail } from "./email-template";

describe("branded transactional email", () => {
	it("provides responsive, accessible tables, a logo, CTA, preview, and fallback link", () => {
		const html = renderBrandedEmail({
			title: "Review your document",
			preview: "A signature is requested.",
			paragraphs: ["Read the PDF before you sign."],
			action: { label: "Review and sign", url: "https://sign.runlumi.app/signing/fixture?a=1&b=2" },
			note: "This link expires in 7 days.",
		});
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('role="presentation"');
		expect(html).toContain('alt="Lumi"');
		expect(html).toContain("max-width:600px");
		expect(html).toContain("[if mso]");
		expect(html).toContain("Review and sign");
		expect(html).toContain("copy this link");
		expect(html).toContain("a=1&amp;b=2");
		expect(html).toContain("7 days");
	});
	it("escapes user content in every slot", () => {
		const unsafe = '<img src=x onerror="alert(1)">';
		const html = renderBrandedEmail({
			title: unsafe,
			preview: unsafe,
			greeting: unsafe,
			paragraphs: [unsafe],
			details: [{ label: unsafe, value: unsafe }],
			note: unsafe,
			action: { label: unsafe, url: "https://example.com/?name=%3Cscript%3E" },
		});
		expect(html).not.toContain(unsafe);
		expect(html).toContain("&lt;img");
	});
	it("rejects executable action schemes", () => {
		expect(() =>
			renderBrandedEmail({
				title: "Review",
				preview: "Review",
				paragraphs: [],
				action: { label: "Open", url: "javascript:alert(1)" },
			}),
		).toThrow("Invalid email action URL");
	});
	it("renders attachment-only messages without a broken action link", () => {
		const html = renderBrandedEmail({
			title: "Signed PDF",
			preview: "Your PDF is attached.",
			paragraphs: ["Keep the attachment for your records."],
		});
		expect(html).not.toContain("copy this link");
		expect(html).toContain("Keep the attachment");
	});
});
