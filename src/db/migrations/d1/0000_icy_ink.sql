CREATE TABLE `agentic_access_links` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`credential_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`activated_at` integer,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agentic_access_links_credential_hash_unique` ON `agentic_access_links` (`credential_hash`);--> statement-breakpoint
CREATE TABLE `agentic_access_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`email` text NOT NULL,
	`link_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `agentic_access_links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agentic_access_requests_idempotency_key_unique` ON `agentic_access_requests` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `agentic_api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_hint` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`active_slot` integer,
	`last_used_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agentic_api_tokens_token_hash_unique` ON `agentic_api_tokens` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `agentic_api_tokens_email_active_slot_unique` ON `agentic_api_tokens` (`email`,`active_slot`);--> statement-breakpoint
CREATE TABLE `agentic_command_records` (
	`id` text PRIMARY KEY NOT NULL,
	`token_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`operation` text NOT NULL,
	`request_fingerprint` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`review_id` text,
	`principal_email` text,
	`token_name` text,
	`reviewer_email` text,
	`reviewer_role` text,
	`reviewer_recipient_id` text,
	`reviewer_fields_snapshot` text,
	`reviewer_fields_digest` text,
	`document_title` text,
	`source_document_id` text,
	`source_version` integer,
	`source_sha256` text,
	`action_payload` text,
	`action_payload_digest` text,
	`expires_at` integer,
	`decision_at` integer,
	`terminal_reason` text,
	`notification_status` text,
	`notification_provider_message` text,
	`decided_by_email` text,
	`decided_by_session_id` text,
	`response_status` integer,
	`response_body` text,
	`document_id` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`token_id`) REFERENCES `agentic_api_tokens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agentic_command_records_token_key_unique` ON `agentic_command_records` (`token_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `agentic_command_records_review_id_unique` ON `agentic_command_records` (`review_id`);--> statement-breakpoint
CREATE TABLE `agentic_email_records` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`email` text NOT NULL,
	`kind` text NOT NULL,
	`delivery_status` text NOT NULL,
	`provider_message` text,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `agentic_access_links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agentic_management_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`email` text NOT NULL,
	`session_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `agentic_access_links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agentic_management_sessions_session_hash_unique` ON `agentic_management_sessions` (`session_hash`);--> statement-breakpoint
CREATE TABLE `agentic_security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text,
	`session_id` text,
	`token_id` text,
	`token_name` text,
	`document_id` text,
	`email` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`request_ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `agentic_access_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `agentic_management_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`token_id`) REFERENCES `agentic_api_tokens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`recipient_id` text,
	`event_type` text NOT NULL,
	`message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `envelope_recipients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`surname` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_email_unique` ON `clients` (`email`);--> statement-breakpoint
CREATE TABLE `email_send_records` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`token_id` text NOT NULL,
	`email` text NOT NULL,
	`kind` text NOT NULL,
	`fallback_url` text,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `envelope_recipients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`token_id`) REFERENCES `signer_tokens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `envelope_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`type` text NOT NULL,
	`page` integer NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `envelope_recipients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `envelope_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `envelopes` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`signing_mode` text DEFAULT 'me_and_another_signer' NOT NULL,
	`created_by` text NOT NULL,
	`created_by_name` text,
	`created_at` integer NOT NULL,
	`sent_by` text,
	`sent_at` integer
);
--> statement-breakpoint
CREATE TABLE `field_values` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text NOT NULL,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `envelope_recipients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`field_id`) REFERENCES `envelope_fields`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `final_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`sha256` text NOT NULL,
	`byte_size` integer NOT NULL,
	`content_type` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `final_documents_r2_key_unique` ON `final_documents` (`r2_key`);--> statement-breakpoint
CREATE TABLE `history_access_links` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`credential_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`activated_at` integer,
	`consumed_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_access_links_credential_hash_unique` ON `history_access_links` (`credential_hash`);--> statement-breakpoint
CREATE TABLE `history_access_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`email` text NOT NULL,
	`link_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `history_access_links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_access_requests_idempotency_key_unique` ON `history_access_requests` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `history_email_records` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`email` text NOT NULL,
	`kind` text NOT NULL,
	`delivery_status` text NOT NULL,
	`provider_message` text,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `history_access_links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `history_security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text,
	`session_id` text,
	`envelope_id` text,
	`email` text NOT NULL,
	`event_type` text NOT NULL,
	`request_ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `history_access_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `history_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `history_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`email` text NOT NULL,
	`session_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `history_access_links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_sessions_session_hash_unique` ON `history_sessions` (`session_hash`);--> statement-breakpoint
CREATE TABLE `idempotency_records` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`operation` text NOT NULL,
	`created_by` text NOT NULL,
	`envelope_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_records_key_operation_created_by_unique` ON `idempotency_records` (`key`,`operation`,`created_by`);--> statement-breakpoint
CREATE TABLE `rate_limit_records` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`operation` text NOT NULL,
	`attempts` integer NOT NULL,
	`reset_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_records_key_operation_unique` ON `rate_limit_records` (`key`,`operation`);--> statement-breakpoint
CREATE TABLE `sender_verification_email_records` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`token_id` text NOT NULL,
	`email` text NOT NULL,
	`kind` text NOT NULL,
	`fallback_url` text,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`token_id`) REFERENCES `sender_verification_tokens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sender_verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`verified_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sender_verification_tokens_token_unique` ON `sender_verification_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `signature_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`created_by` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`svg_path` text,
	`typed_text` text,
	`typed_font` text,
	`selected` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `signer_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer NOT NULL,
	`verified_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `envelope_recipients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `signer_tokens_token_unique` ON `signer_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `source_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`sha256` text NOT NULL,
	`byte_size` integer NOT NULL,
	`content_type` text NOT NULL,
	`original_filename` text DEFAULT 'document.pdf' NOT NULL,
	`uploaded_by` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_documents_r2_key_unique` ON `source_documents` (`r2_key`);