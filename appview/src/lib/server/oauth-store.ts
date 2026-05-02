import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { JoseKey } from '@atproto/jwk-jose';
import type {
	InternalStateData,
	Jwk,
	Key,
	Session,
	SessionStore,
	StateStore
} from '@atproto/oauth-client';

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
	createBrowserSession(did: string, grantedScope: string): Promise<BrowserSessionBinding>;
	getBrowserSession(sessionId: string): Promise<BrowserSessionBinding | null>;
	deleteBrowserSession(sessionId: string): Promise<void>;
}

type JwkBackedStore<K extends string, V> = {
	set(key: K, value: V): Promise<void>;
	get(key: K): Promise<V | undefined>;
	del(key: K): Promise<void>;
	clear?(): Promise<void>;
};

type ToDpopJwkValue<V extends { dpopKey: Key }> = Omit<V, 'dpopKey'> & {
	dpopJwk: Jwk;
};

export type SavedOauthState = ToDpopJwkValue<InternalStateData>;
export type SavedOauthStateStore = JwkBackedStore<string, SavedOauthState>;

export type SavedOauthSession = ToDpopJwkValue<Session>;
export type SavedOauthSessionStore = JwkBackedStore<string, SavedOauthSession>;

export interface AppviewOauthStores {
	stateStore: SavedOauthStateStore;
	sessionStore: SavedOauthSessionStore;
	browserSessionStore: BrowserSessionStore;
	close(): void;
}

class SqliteJsonStore<T> {
	constructor(
		private readonly db: DatabaseSync,
		private readonly tableName: string,
		private readonly keyColumn: string,
		private readonly timestampColumn: string
	) {}

	async set(key: string, value: T, timestamp: string): Promise<void> {
		this.db
			.prepare(
				`INSERT OR REPLACE INTO ${this.tableName} (${this.keyColumn}, value_json, ${this.timestampColumn}) VALUES (?, ?, ?)`
			)
			.run(key, JSON.stringify(value), timestamp);
	}

	async get(key: string): Promise<T | undefined> {
		const row = this.db
			.prepare(`SELECT value_json FROM ${this.tableName} WHERE ${this.keyColumn} = ?`)
			.get(key) as JsonRow | undefined;
		return row ? (JSON.parse(row.value_json) as T) : undefined;
	}

	async del(key: string): Promise<void> {
		this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${this.keyColumn} = ?`).run(key);
	}

	async clear(): Promise<void> {
		this.db.prepare(`DELETE FROM ${this.tableName}`).run();
	}
}

class SqliteOauthStateStore implements SavedOauthStateStore {
	private readonly store: SqliteJsonStore<SavedOauthState>;

	constructor(db: DatabaseSync) {
		this.store = new SqliteJsonStore<SavedOauthState>(
			db,
			'oauth_states',
			'state_key',
			'created_at'
		);
	}

	async set(key: string, value: SavedOauthState): Promise<void> {
		await this.store.set(key, value, new Date().toISOString());
	}

	get(key: string): Promise<SavedOauthState | undefined> {
		return this.store.get(key);
	}

	del(key: string): Promise<void> {
		return this.store.del(key);
	}

	clear(): Promise<void> {
		return this.store.clear();
	}
}

class SqliteOauthSessionStore implements SavedOauthSessionStore {
	private readonly store: SqliteJsonStore<SavedOauthSession>;

	constructor(db: DatabaseSync) {
		this.store = new SqliteJsonStore<SavedOauthSession>(
			db,
			'oauth_sessions',
			'subject',
			'updated_at'
		);
	}

	async set(key: string, value: SavedOauthSession): Promise<void> {
		await this.store.set(key, value, new Date().toISOString());
	}

	get(key: string): Promise<SavedOauthSession | undefined> {
		return this.store.get(key);
	}

	del(key: string): Promise<void> {
		return this.store.del(key);
	}

	clear(): Promise<void> {
		return this.store.clear();
	}
}

class SqliteBrowserSessionStore implements BrowserSessionStore {
	constructor(private readonly db: DatabaseSync) {}

	async createBrowserSession(did: string, grantedScope: string): Promise<BrowserSessionBinding> {
		const timestamp = new Date().toISOString();
		const sessionId = randomUUID().replace(/-/g, '');
		this.db
			.prepare(
				`INSERT INTO browser_sessions (session_id, did, granted_scope, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
			)
			.run(sessionId, did, grantedScope, timestamp, timestamp);

		return {
			sessionId,
			did,
			grantedScope,
			createdAt: timestamp,
			updatedAt: timestamp
		};
	}

	async getBrowserSession(sessionId: string): Promise<BrowserSessionBinding | null> {
		const row = this.db
			.prepare(
				`SELECT session_id, did, granted_scope, created_at, updated_at FROM browser_sessions WHERE session_id = ?`
			)
			.get(sessionId) as BrowserSessionRow | undefined;

		return row
			? {
					sessionId: row.session_id,
					did: row.did,
					grantedScope: row.granted_scope,
					createdAt: row.created_at,
					updatedAt: row.updated_at
				}
			: null;
	}

	async deleteBrowserSession(sessionId: string): Promise<void> {
		this.db.prepare(`DELETE FROM browser_sessions WHERE session_id = ?`).run(sessionId);
	}
}

function ensureAuthTables(db: DatabaseSync) {
	db.exec(`
CREATE TABLE IF NOT EXISTS oauth_states (
	state_key TEXT PRIMARY KEY,
	value_json TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_sessions (
	subject TEXT PRIMARY KEY,
	value_json TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS browser_sessions (
	session_id TEXT PRIMARY KEY,
	did TEXT NOT NULL,
	granted_scope TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
`);
}

export function toOauthKeyStore<K extends string, V extends { dpopKey: Key; dpopJwk?: never }>(
	store: JwkBackedStore<K, ToDpopJwkValue<V>>
): JwkBackedStore<K, V> {
	return {
		async set(key: K, value: V) {
			const { dpopKey, ...rest } = value;
			const dpopJwk = dpopKey.privateJwk;
			if (!dpopJwk) {
				throw new Error('Private DPoP JWK is missing.');
			}

			await store.set(key, {
				...rest,
				dpopJwk
			} as ToDpopJwkValue<V>);
		},

		async get(key: K) {
			const result = await store.get(key);
			if (!result) {
				return undefined;
			}

			const { dpopJwk, ...rest } = result;
			const dpopKey = await JoseKey.fromJWK(dpopJwk);
			return {
				...rest,
				dpopKey
			} as unknown as V;
		},

		del: store.del.bind(store),
		clear: store.clear?.bind(store)
	};
}

export function toOauthStateStore(store: SavedOauthStateStore): StateStore {
	return toOauthKeyStore<string, InternalStateData>(store);
}

export function toOauthSessionStore(store: SavedOauthSessionStore): SessionStore {
	return toOauthKeyStore<string, Session>(store);
}

export function createAppviewOauthStores(dbPath: string): AppviewOauthStores {
	mkdirSync(dirname(dbPath), { recursive: true });
	const db = new DatabaseSync(dbPath);
	ensureAuthTables(db);

	return {
		stateStore: new SqliteOauthStateStore(db),
		sessionStore: new SqliteOauthSessionStore(db),
		browserSessionStore: new SqliteBrowserSessionStore(db),
		close() {
			db.close();
		}
	};
}
