import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const envelopeStatuses = [
	"awaiting_verification",
	"draft",
	"changes_requested",
	"sent",
	"completed",
	"declined",
	"expired",
	"deleted",
] as const;
export const signingModes = ["only_me", "me_and_another_signer"] as const;
export const recipientStatuses = ["pending", "sent", "completed", "declined"] as const;
export const senderVerificationStatuses = ["pending", "verified", "expired"] as const;
export const fieldTypes = ["signature", "date"] as const;
export const signatureProfileKinds = ["drawn", "typed"] as const;

export const envelopes = sqliteTable("envelopes", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	status: text("status").notNull().default("draft"),
	signingMode: text("signing_mode").notNull().default("me_and_another_signer"),
	createdBy: text("created_by").notNull(),
	createdByName: text("created_by_name"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
	sentBy: text("sent_by"),
	sentAt: integer("sent_at", { mode: "timestamp_ms" }),
});

export const idempotencyRecords = sqliteTable(
	"idempotency_records",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		key: text("key").notNull(),
		operation: text("operation").notNull(),
		createdBy: text("created_by").notNull(),
		envelopeId: text("envelope_id")
			.notNull()
			.references(() => envelopes.id),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("idempotency_records_key_operation_created_by_unique").on(
			table.key,
			table.operation,
			table.createdBy,
		),
	],
);

export const senderVerificationTokens = sqliteTable("sender_verification_tokens", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	name: text("name").notNull(),
	email: text("email").notNull(),
	token: text("token").notNull().unique(),
	status: text("status").notNull().default("pending"),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const senderVerificationEmailRecords = sqliteTable("sender_verification_email_records", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	tokenId: text("token_id")
		.notNull()
		.references(() => senderVerificationTokens.id),
	email: text("email").notNull(),
	kind: text("kind").notNull(),
	fallbackUrl: text("fallback_url"),
	sentAt: integer("sent_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const rateLimitRecords = sqliteTable(
	"rate_limit_records",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		key: text("key").notNull(),
		operation: text("operation").notNull(),
		attempts: integer("attempts").notNull(),
		resetAt: integer("reset_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("rate_limit_records_key_operation_unique").on(table.key, table.operation),
	],
);

export const sourceDocuments = sqliteTable("source_documents", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	r2Key: text("r2_key").notNull().unique(),
	version: integer("version").notNull().default(1),
	sha256: text("sha256").notNull(),
	byteSize: integer("byte_size").notNull(),
	contentType: text("content_type").notNull(),
	originalFilename: text("original_filename").notNull().default("document.pdf"),
	uploadedBy: text("uploaded_by").notNull(),
	uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const finalDocuments = sqliteTable("final_documents", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	r2Key: text("r2_key").notNull().unique(),
	sha256: text("sha256").notNull(),
	byteSize: integer("byte_size").notNull(),
	contentType: text("content_type").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const envelopeRecipients = sqliteTable("envelope_recipients", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	name: text("name").notNull(),
	email: text("email").notNull(),
	status: text("status").notNull().default("pending"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const signatureProfiles = sqliteTable("signature_profiles", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	createdBy: text("created_by").notNull(),
	kind: text("kind").notNull(),
	label: text("label").notNull(),
	svgPath: text("svg_path"),
	typedText: text("typed_text"),
	typedFont: text("typed_font"),
	selected: integer("selected", { mode: "boolean" }).notNull().default(true),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const signerTokens = sqliteTable("signer_tokens", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	recipientId: text("recipient_id")
		.notNull()
		.references(() => envelopeRecipients.id),
	token: text("token").notNull().unique(),
	status: text("status").notNull().default("active"),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const emailSendRecords = sqliteTable("email_send_records", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	recipientId: text("recipient_id")
		.notNull()
		.references(() => envelopeRecipients.id),
	tokenId: text("token_id")
		.notNull()
		.references(() => signerTokens.id),
	email: text("email").notNull(),
	kind: text("kind").notNull(),
	fallbackUrl: text("fallback_url"),
	sentAt: integer("sent_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const envelopeFields = sqliteTable("envelope_fields", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	recipientId: text("recipient_id")
		.notNull()
		.references(() => envelopeRecipients.id),
	type: text("type").notNull(),
	page: integer("page").notNull(),
	x: integer("x").notNull(),
	y: integer("y").notNull(),
	width: integer("width").notNull(),
	height: integer("height").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const fieldValues = sqliteTable("field_values", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	recipientId: text("recipient_id")
		.notNull()
		.references(() => envelopeRecipients.id),
	fieldId: text("field_id")
		.notNull()
		.references(() => envelopeFields.id),
	value: text("value").notNull(),
	completedAt: integer("completed_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	envelopeId: text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	recipientId: text("recipient_id").references(() => envelopeRecipients.id),
	eventType: text("event_type").notNull(),
	message: text("message"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});
