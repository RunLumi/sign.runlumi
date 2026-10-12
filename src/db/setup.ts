import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/d1";

const databases = new AsyncLocalStorage<ReturnType<typeof drizzle>>();

export function withDatabase<T>(binding: D1Database, callback: () => T): T {
	return databases.run(drizzle(binding), callback);
}

export function getDb() {
	const db = databases.getStore();
	if (!db) throw new Error("Database is unavailable outside a Worker request.");
	return db;
}
