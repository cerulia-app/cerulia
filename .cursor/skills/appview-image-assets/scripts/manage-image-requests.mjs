#!/usr/bin/env node
/**
 * Manages IMAGE-REQUESTS.md at the workspace root.
 *
 * Commands:
 *   add    <entry-file>               — Append a new entry read from <entry-file>
 *   get    <image-path>               — Print the entry matching <image-path>
 *   delete <image-path>               — Remove the entry matching <image-path>
 *   update <image-path> <entry-file>  — Replace the entry with content from <entry-file>
 *   list                              — List all registered image paths
 *
 * <entry-file> is a path to a markdown file containing one entry block.
 *   Pass "-" to read from stdin instead.
 *
 * <image-path> accepts the full relative path (appview/static/images/foo.png),
 *   a suffix (images/foo.png), or just the filename (foo.png).
 *   A suffix match is used when the exact path does not match.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REQUESTS_FILE = resolve(process.cwd(), "IMAGE-REQUESTS.md");

const INITIAL_HEADER = `# IMAGE-REQUESTS.md

appview の実装で必要な画像の制作仕様を記載しています。

## 使い方

1. 各セクションの仕様に従い、外部ツール（生成 AI または手作業）で画像を制作してください。
2. 制作した画像を「ファイルパス」欄と同じ名前に変更してください。
3. \`appview/static/\` 内の対応するプレースホルダーファイル（現在は透明 PNG）を置き換えてください。
4. コードの変更は不要です。ファイルを置き換えるだけで反映されます。`;

/** Matches the ファイルパス table row and captures the stored path. */
const FILE_PATH_RE = /\*\*ファイルパス\*\*\s*\|\s*`([^`]+)`/;

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

function readRaw() {
	if (!existsSync(REQUESTS_FILE)) return INITIAL_HEADER + "\n\n---\n";
	return readFileSync(REQUESTS_FILE, "utf8").replace(/\r\n/g, "\n");
}

/**
 * Splits the file content into the header and a list of entry strings.
 * Entries are the blocks separated by "---" standalone lines.
 * The header is everything before the first "---".
 */
function parseContent(raw) {
	const parts = raw.split(/\n---\n/);
	const header = parts[0].trimEnd();
	const entries = parts
		.slice(1)
		.map((s) => s.trim())
		.filter(Boolean);
	return { header, entries };
}

/**
 * Serialises the header and entries back into IMAGE-REQUESTS.md content.
 * Format: HEADER \n\n---\n [\n ENTRY \n\n---\n ...]
 */
function serialize(header, entries) {
	if (entries.length === 0) return header + "\n\n---\n";
	return (
		header + "\n\n---\n" + entries.map((e) => "\n" + e + "\n\n---\n").join("")
	);
}

// ---------------------------------------------------------------------------
// Entry lookup helpers
// ---------------------------------------------------------------------------

function getFilePath(entry) {
	const m = entry.match(FILE_PATH_RE);
	return m ? m[1] : null;
}

/**
 * Returns true when the stored ファイルパス of an entry matches the key.
 * Accepts: exact match, suffix match separated by "/", or filename-only match.
 */
function matches(entry, key) {
	const fp = getFilePath(entry);
	if (!fp) return false;
	return fp === key || fp.endsWith("/" + key);
}

// ---------------------------------------------------------------------------
// Entry reading
// ---------------------------------------------------------------------------

async function readEntry(filePath) {
	if (filePath === "-") {
		const bufs = [];
		for await (const chunk of process.stdin) bufs.push(chunk);
		return Buffer.concat(bufs).toString("utf8").trim();
	}
	const abs = resolve(process.cwd(), filePath);
	if (!existsSync(abs)) {
		console.error(`Error: entry file not found: ${abs}`);
		process.exit(1);
	}
	return readFileSync(abs, "utf8").trim();
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const [, , command, arg1, arg2] = process.argv;

if (!command) {
	console.error(
		"Usage: node manage-image-requests.mjs <add|get|delete|update|list> [args]",
	);
	process.exit(1);
}

switch (command) {
	case "add": {
		// add <entry-file>
		if (!arg1) {
			console.error("Usage: manage-image-requests.mjs add <entry-file>");
			process.exit(1);
		}
		const entry = await readEntry(arg1);
		if (!entry) {
			console.error("Error: entry file is empty.");
			process.exit(1);
		}
		const { header, entries } = parseContent(readRaw());
		const fp = getFilePath(entry);
		if (fp && entries.some((e) => matches(e, fp))) {
			console.error(
				`Error: an entry for "${fp}" already exists. Use "update" to replace it.`,
			);
			process.exit(1);
		}
		writeFileSync(REQUESTS_FILE, serialize(header, [...entries, entry]));
		console.log(`Added entry${fp ? ": " + fp : ""}.`);
		break;
	}

	case "get": {
		// get <image-path>
		if (!arg1) {
			console.error("Usage: manage-image-requests.mjs get <image-path>");
			process.exit(1);
		}
		const { entries } = parseContent(readRaw());
		const found = entries.find((e) => matches(e, arg1));
		if (!found) {
			console.error(`Not found: ${arg1}`);
			process.exit(1);
		}
		process.stdout.write(found + "\n");
		break;
	}

	case "delete": {
		// delete <image-path>
		if (!arg1) {
			console.error("Usage: manage-image-requests.mjs delete <image-path>");
			process.exit(1);
		}
		const { header, entries } = parseContent(readRaw());
		const before = entries.length;
		const next = entries.filter((e) => !matches(e, arg1));
		if (next.length === before) {
			console.error(`Not found: ${arg1}`);
			process.exit(1);
		}
		writeFileSync(REQUESTS_FILE, serialize(header, next));
		console.log(`Deleted entry: ${arg1}`);
		break;
	}

	case "update": {
		// update <image-path> <entry-file>
		if (!arg1 || !arg2) {
			console.error(
				"Usage: manage-image-requests.mjs update <image-path> <entry-file>",
			);
			process.exit(1);
		}
		const entry = await readEntry(arg2);
		if (!entry) {
			console.error("Error: entry file is empty.");
			process.exit(1);
		}
		const { header, entries } = parseContent(readRaw());
		const idx = entries.findIndex((e) => matches(e, arg1));
		if (idx === -1) {
			console.error(`Not found: ${arg1}`);
			process.exit(1);
		}
		entries[idx] = entry;
		writeFileSync(REQUESTS_FILE, serialize(header, entries));
		console.log(`Updated entry: ${arg1}`);
		break;
	}

	case "list": {
		const { entries } = parseContent(readRaw());
		if (entries.length === 0) {
			console.log("No entries in IMAGE-REQUESTS.md.");
			break;
		}
		for (const entry of entries) {
			const fp = getFilePath(entry);
			const heading = entry.match(/^##\s+(.+)/);
			console.log(
				`  ${fp ?? "(no path)"}  —  ${heading ? heading[1] : "(unnamed)"}`,
			);
		}
		break;
	}

	default: {
		console.error(`Unknown command: ${command}`);
		console.error("Commands: add, get, delete, update, list");
		process.exit(1);
	}
}
