import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
	id: text("id")
		.$defaultFn(() => crypto.randomUUID())
		.primaryKey(),
	name: text("name").notNull(),
	surname: text("surname").notNull(),
	email: text("email").notNull().unique(),
});
