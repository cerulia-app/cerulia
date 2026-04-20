import type {
	NodeSavedSession,
	NodeSavedSessionStore,
	NodeSavedState,
	NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import { createOpaqueId } from "../ids.js";
import type { SqlDriver } from "./sql.js";

interface JsonRow {
	value_json: string;
}

interface BrowserSessionRow {
	session_id: string;
	did: string;
	granted_scope: string;
	created_at: string;
	updated_at: string;
}

export interface BrowserSessionBinding {
	sessionId: string;
	did: string;
	grantedScope: string;
	createdAt: string;
	updatedAt: string;
}

export interface BrowserSessionStore {
	createBrowserSession(
		did: string,
		grantedScope: string,
	): Promise<BrowserSessionBinding>;
	getBrowserSession(sessionId: string): Promise<BrowserSessionBinding | null>;
	deleteBrowserSession(sessionId: string): Promise<void>;
	clear?(): Promise<void>;
}

export interface OAuthSessionCatalog {
	listSubjects(): Promise<string[]>;
}

class SqlJsonStore<T> {
	constructor(
		private readonly driver: SqlDriver,
		private readonly tableName: string,
		private readonly keyColumn: string,
	) {}

	async set(key: string, value: T, timestamp: string): Promise<void> {
		await this.driver.run(
			`INSERT OR REPLACE INTO ${this.tableName} (${this.keyColumn}, value_json, ${this.tableName === "oauth_states" ? "created_at" : "updated_at"})
       VALUES (?, ?, ?)`,
			[key, JSON.stringify(value), timestamp],
		);
	}

	async get(key: string): Promise<T | undefined> {
		const row = await this.driver.get<JsonRow>(
			`SELECT value_json FROM ${this.tableName} WHERE ${this.keyColumn} = ?`,
			[key],
		);
		return row ? (JSON.parse(row.value_json) as T) : undefined;
	}

	async del(key: string): Promise<void> {
		await this.driver.run(
			`DELETE FROM ${this.tableName} WHERE ${this.keyColumn} = ?`,
			[key],
		);
	}

	async clear(): Promise<void> {
		await this.driver.run(`DELETE FROM ${this.tableName}`);
	}
}

export class SqlOauthStateStore implements NodeSavedStateStore {
	private readonly store: SqlJsonStore<NodeSavedState>;

	constructor(private readonly driver: SqlDriver) {
		this.store = new SqlJsonStore<NodeSavedState>(
			driver,
			"oauth_states",
			"state_key",
		);
	}

	async set(key: string, value: NodeSavedState): Promise<void> {
		await this.store.set(key, value, new Date().toISOString());
	}

	async get(key: string): Promise<NodeSavedState | undefined> {
		return this.store.get(key);
	}

	async del(key: string): Promise<void> {
		await this.store.del(key);
	}

	async clear(): Promise<void> {
		await this.store.clear();
	}
}

export class SqlOauthSessionStore
	implements NodeSavedSessionStore, OAuthSessionCatalog
{
	private readonly store: SqlJsonStore<NodeSavedSession>;

	constructor(private readonly driver: SqlDriver) {
		this.store = new SqlJsonStore<NodeSavedSession>(
			driver,
			"oauth_sessions",
			"subject",
		);
	}

	async set(key: string, value: NodeSavedSession): Promise<void> {
		await this.store.set(key, value, new Date().toISOString());
	}

	async get(key: string): Promise<NodeSavedSession | undefined> {
		return this.store.get(key);
	}

	async del(key: string): Promise<void> {
		await this.store.del(key);
	}

	async clear(): Promise<void> {
		await this.store.clear();
	}

	async listSubjects(): Promise<string[]> {
		const rows = await this.driver.all<{ subject: string }>(
			`SELECT subject FROM oauth_sessions ORDER BY subject ASC`,
		);
		return rows.map((row) => row.subject);
	}
}

export class SqlBrowserSessionStore implements BrowserSessionStore {
	constructor(private readonly driver: SqlDriver) {}

	async createBrowserSession(
		did: string,
		grantedScope: string,
	): Promise<BrowserSessionBinding> {
		const timestamp = new Date().toISOString();
		const sessionId = createOpaqueId();

		await this.driver.run(
			`INSERT INTO browser_sessions (session_id, did, granted_scope, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
			[sessionId, did, grantedScope, timestamp, timestamp],
		);

		return {
			sessionId,
			did,
			grantedScope,
			createdAt: timestamp,
			updatedAt: timestamp,
		};
	}

	async getBrowserSession(
		sessionId: string,
	): Promise<BrowserSessionBinding | null> {
		const row = await this.driver.get<BrowserSessionRow>(
			`SELECT session_id, did, granted_scope, created_at, updated_at
       FROM browser_sessions
       WHERE session_id = ?`,
			[sessionId],
		);

		return row
			? {
				sessionId: row.session_id,
				did: row.did,
				grantedScope: row.granted_scope,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			}
			: null;
	}

	async deleteBrowserSession(sessionId: string): Promise<void> {
		await this.driver.run(
			`DELETE FROM browser_sessions WHERE session_id = ?`,
			[sessionId],
		);
	}

	async clear(): Promise<void> {
		await this.driver.run(`DELETE FROM browser_sessions`);
	}
}

function createMemoryJsonStore<T>() {
	const values = new Map<string, T>();

	return {
		async set(key: string, value: T): Promise<void> {
			values.set(key, value);
		},
		async get(key: string): Promise<T | undefined> {
			return values.get(key);
		},
		async del(key: string): Promise<void> {
			values.delete(key);
		},
		async clear(): Promise<void> {
			values.clear();
		},
	};
}

export function createMemoryOauthStores() {
	const stateStore = createMemoryJsonStore<NodeSavedState>();
	const sessionValues = new Map<string, NodeSavedSession>();
	const sessionStore: NodeSavedSessionStore & OAuthSessionCatalog = {
		async set(key: string, value: NodeSavedSession): Promise<void> {
			sessionValues.set(key, value);
		},
		async get(key: string): Promise<NodeSavedSession | undefined> {
			return sessionValues.get(key);
		},
		async del(key: string): Promise<void> {
			sessionValues.delete(key);
		},
		async clear(): Promise<void> {
			sessionValues.clear();
		},
		async listSubjects(): Promise<string[]> {
			return [...sessionValues.keys()].sort((left, right) =>
				left.localeCompare(right),
			);
		},
	};
	const browserSessions = new Map<string, BrowserSessionBinding>();

	const browserSessionStore: BrowserSessionStore = {
		async createBrowserSession(did, grantedScope) {
			const timestamp = new Date().toISOString();
			const sessionId = createOpaqueId();
			const binding = {
				sessionId,
				did,
				grantedScope,
				createdAt: timestamp,
				updatedAt: timestamp,
			};
			browserSessions.set(sessionId, binding);
			return binding;
		},
		async getBrowserSession(sessionId) {
			return browserSessions.get(sessionId) ?? null;
		},
		async deleteBrowserSession(sessionId) {
			browserSessions.delete(sessionId);
		},
		async clear() {
			browserSessions.clear();
		},
	};

	return {
		stateStore,
		sessionStore,
		browserSessionStore,
	};
}

export function createSqlOauthStores(driver: SqlDriver) {
	return {
		stateStore: new SqlOauthStateStore(driver),
		sessionStore: new SqlOauthSessionStore(driver),
		browserSessionStore: new SqlBrowserSessionStore(driver),
	};
}