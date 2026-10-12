interface BrandedEmailInput {
	title: string;
	preview: string;
	greeting?: string;
	paragraphs: readonly string[];
	action?: { label: string; url: string };
	details?: readonly { label: string; value: string }[];
	note?: string;
}

/** Plain input only: all user content is escaped before it enters email markup. */
export function renderBrandedEmail(input: BrandedEmailInput): string {
	const actionUrl = input.action ? safeActionUrl(input.action.url) : null;
	const paragraphs = input.paragraphs
		.map((text) => `<p style="margin:0 0 20px;line-height:1.65;">${escapeHtml(text)}</p>`)
		.join("");
	const details =
		input.details
			?.map(
				({ label, value }) =>
					`<tr><td style="padding:10px 0;border-bottom:1px solid #e7eaf0;font-size:14px;line-height:1.6;"><strong style="display:block;color:#102a43;">${escapeHtml(label)}</strong><span style="white-space:pre-line;overflow-wrap:anywhere;">${escapeHtml(value)}</span></td></tr>`,
			)
			.join("") ?? "";
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(input.title)}</title>
<style>@media only screen and (max-width:600px){.email-outer{padding:20px 12px!important}.email-content{padding:28px 24px!important}.email-title{font-size:28px!important}} a:focus{outline:2px solid #006093;outline-offset:4px}</style></head>
<body style="margin:0;padding:0;background:#f4f0e8;color:#172033;font-family:Geist,Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0e8;"><tr><td class="email-outer" align="center" style="padding:40px 20px;">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid #d9dee8;border-radius:12px;background:#ffffff;">
<tr><td style="padding:16px 24px;border-bottom:1px solid #e7eaf0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="64"><img src="https://sign.runlumi.app/brand/lumi-email-logo.png" width="64" height="64" alt="Lumi" style="display:block;border:0;"></td><td style="font-size:20px;font-weight:600;letter-spacing:-0.5px;color:#102a43;">Lumi Sign</td></tr></table></td></tr>
<tr><td class="email-content" style="padding:36px 40px;font-size:16px;line-height:1.65;">
<p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#006093;letter-spacing:1px;">DOCUMENT WORKFLOW</p>
<h1 class="email-title" style="margin:0 0 24px;font-size:32px;font-weight:600;line-height:1.2;letter-spacing:-0.8px;color:#102a43;">${escapeHtml(input.title)}</h1>
${input.greeting ? `<p style="margin:0 0 20px;">${escapeHtml(input.greeting)}</p>` : ""}${paragraphs}
${details ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;">${details}</table>` : ""}
${input.action && actionUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td bgcolor="#006093" style="border-radius:8px;mso-padding-alt:14px 24px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 24px;border:1px solid #006093;border-radius:8px;font-size:16px;line-height:24px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(input.action.label)}</a></td></tr></table>` : ""}
${input.note ? `<p style="margin:24px 0 0;padding:16px;border-left:3px solid #006093;background:#e4f3fc;font-size:14px;line-height:1.6;color:#102a43;">${escapeHtml(input.note)}</p>` : ""}
${actionUrl ? `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#5e6677;">If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(actionUrl)}" style="color:#006093;word-break:break-all;overflow-wrap:anywhere;">${escapeHtml(actionUrl)}</a></p>` : ""}
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;"><tr><td style="padding:24px 12px;text-align:center;font-size:12px;line-height:1.7;color:#5e6677;">Lumi Sign · Part of Lumi<br>PDF signing, with a clear record.<br><a href="https://sign.runlumi.app" style="color:#006093;text-decoration:underline;">Open Lumi Sign</a></td></tr></table>
</td></tr></table></body></html>`;
}

function safeActionUrl(value: string): string {
	const url = new URL(value);
	if (url.protocol !== "https:" && url.protocol !== "http:")
		throw new Error("Invalid email action URL");
	return value;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
