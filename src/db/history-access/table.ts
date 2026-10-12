import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { envelopes } from "@/db/envelope/table";

export const historyAccessLinks = sqliteTable(
	"history_access_links",
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
		revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [uniqueIndex("history_access_links_credential_hash_unique").on(table.credentialHash)],
);

export const historyAccessRequests = sqliteTable(
	"history_access_requests",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		idempotencyKey: text("idempotency_key").notNull(),
		email: text("email").notNull(),
		linkId: text("link_id").references(() => historyAccessLinks.id),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("history_access_requests_idempotency_key_unique").on(table.idempotencyKey),
	],
);

export const historyEmailRecords = sqliteTable("history_email_records", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	linkId: text("link_id")
		.notNull()
		.references(() => historyAccessLinks.id),
	email: text("email").notNull(),
	kind: text("kind").notNull(),
	deliveryStatus: text("delivery_status").notNull(),
	providerMessage: text("provider_message"),
	sentAt: integer("sent_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const historySessions = sqliteTable(
	"history_sessions",
	{
		id: text("id")
			.$defaultFn(() => crypto.randomUUID())
			.primaryKey(),
		linkId: text("link_id")
			.notNull()
			.references(() => historyAccessLinks.id),
		email: text("email").notNull(),
		sessionHash: text("session_hash").notNull(),
		status: text("status").notNull().default("active"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [uniqueIndex("history_sessions_session_hash_unique").on(table.sessionHash)],
);

export const historySecurityEvents = sqliteTable("history_security_events", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	linkId: text("link_id").references(() => historyAccessLinks.id),
	sessionId: text("session_id").references(() => historySessions.id),
	envelopeId: text("envelope_id").references(() => envelopes.id),
	email: text("email").notNull(),
	eventType: text("event_type").notNull(),
	requestIp: text("request_ip"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.$defaultFn(() => new Date())
		.notNull(),
});
