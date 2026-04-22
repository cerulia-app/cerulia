import { DEFAULT_LIMIT, MAX_LIMIT } from "./constants.js";
import { ProjectionError } from "./errors.js";

export interface Page<T> {
	items: T[];
	cursor?: string;
}

export function resolveLimit(rawLimit: string | undefined): number {
	if (rawLimit === undefined) {
		return DEFAULT_LIMIT;
	}

	if (!/^\d+$/.test(rawLimit)) {
		throw new ProjectionError(
			"InvalidRequest",
			"limit must be a positive integer",
			400,
		);
	}

	const parsed = Number.parseInt(rawLimit, 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		throw new ProjectionError(
			"InvalidRequest",
			"limit must be a positive integer",
			400,
		);
	}

	return Math.min(parsed, MAX_LIMIT);
}

export function resolveCursor(rawCursor: string | undefined): number {
	if (rawCursor === undefined) {
		return 0;
	}

	if (!/^\d+$/.test(rawCursor)) {
		throw new ProjectionError(
			"InvalidRequest",
			"cursor must be a non-negative integer",
			400,
		);
	}

	const parsed = Number.parseInt(rawCursor, 10);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new ProjectionError(
			"InvalidRequest",
			"cursor must be a non-negative integer",
			400,
		);
	}

	return parsed;
}

export function paginate<T>(
	items: T[],
	rawLimit: string | undefined,
	rawCursor: string | undefined,
): Page<T> {
	const limit = resolveLimit(rawLimit);
	const offset = resolveCursor(rawCursor);
	const pageItems = items.slice(offset, offset + limit);
	const nextOffset = offset + pageItems.length;

	return {
		items: pageItems,
		cursor: nextOffset < items.length ? String(nextOffset) : undefined,
	};
}