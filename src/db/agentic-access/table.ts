import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const agenticAccessLinks = sqliteTable(
	"agentic_access_links",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		email: text("email").notNull(),
		credentialHash: text("credential_hash").notNull(),
		status: text("status").notNull().default("pending"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		activatedAt: integer("activated_at", { mode: "timestamp_ms" }),
		consumedAt: integer("consumed_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [uniqueIndex("agentic_access_links_credential_hash_unique").on(table.credentialHash)],
);

export const agenticAccessRequests = sqliteTable(
	"agentic_access_requests",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		idempotencyKey: text("idempotency_key").notNull(),
		email: text("email").notNull(),
		linkId: text("link_id").references(() => agenticAccessLinks.id),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("agentic_access_requests_idempotency_key_unique").on(table.idempotencyKey),
	],
);

export const agenticEmailRecords = sqliteTable("agentic_email_records", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	linkId: text("link_id")
		.notNull()
		.references(() => agenticAccessLinks.id),
	email: text("email").notNull(),
	kind: text("kind").notNull(),
	deliveryStatus: text("delivery_status").notNull(),
	providerMessage: text("provider_message"),
	sentAt: integer("sent_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const agenticManagementSessions = sqliteTable(
	"agentic_management_sessions",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		linkId: text("link_id")
			.notNull()
			.references(() => agenticAccessLinks.id),
		email: text("email").notNull(),
		sessionHash: text("session_hash").notNull(),
		status: text("status").notNull().default("active"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [uniqueIndex("agentic_management_sessions_session_hash_unique").on(table.sessionHash)],
);

export const agenticApiTokens = sqliteTable(
	"agentic_api_tokens",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		email: text("email").notNull(),
		name: text("name").notNull(),
		tokenHash: text("token_hash").notNull(),
		tokenHint: text("token_hint").notNull(),
		status: text("status").notNull().default("active"),
		activeSlot: integer("active_slot"),
		lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
		revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("agentic_api_tokens_token_hash_unique").on(table.tokenHash),
		uniqueIndex("agentic_api_tokens_email_active_slot_unique").on(table.email, table.activeSlot),
	],
);

export const agenticCommandRecords = sqliteTable(
	"agentic_command_records",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		tokenId: text("token_id")
			.notNull()
			.references(() => agenticApiTokens.id),
		idempotencyKey: text("idempotency_key").notNull(),
		operation: text("operation").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		state: text("state").notNull().default("pending"),
		reviewId: text("review_id"),
		principalEmail: text("principal_email"),
		tokenName: text("token_name"),
		reviewerEmail: text("reviewer_email"),
		reviewerRole: text("reviewer_role"),
		reviewerRecipientId: text("reviewer_recipient_id"),
		reviewerFieldsSnapshot: text("reviewer_fields_snapshot"),
		reviewerFieldsDigest: text("reviewer_fields_digest"),
		documentTitle: text("document_title"),
		sourceDocumentId: text("source_document_id"),
		sourceVersion: integer("source_version"),
		sourceSha256: text("source_sha256"),
		actionPayload: text("action_payload"),
		actionPayloadDigest: text("action_payload_digest"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
		decisionAt: integer("decision_at", { mode: "timestamp_ms" }),
		terminalReason: text("terminal_reason"),
		notificationStatus: text("notification_status"),
		notificationProviderMessage: text("notification_provider_message"),
		decidedByEmail: text("decided_by_email"),
		decidedBySessionId: text("decided_by_session_id"),
		responseStatus: integer("response_status"),
		responseBody: text("response_body"),
		documentId: text("document_id"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		uniqueIndex("agentic_command_records_token_key_unique").on(table.tokenId, table.idempotencyKey),
		uniqueIndex("agentic_command_records_review_id_unique").on(table.reviewId),
	],
);

export const agenticSecurityEvents = sqliteTable("agentic_security_events", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	linkId: text("link_id").references(() => agenticAccessLinks.id),
	sessionId: text("session_id").references(() => agenticManagementSessions.id),
	tokenId: text("token_id").references(() => agenticApiTokens.id),
	tokenName: text("token_name"),
	documentId: text("document_id"),
	email: text("email").notNull(),
	eventType: text("event_type").notNull(),
	actorType: text("actor_type").notNull(),
	requestIp: text("request_ip"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});
