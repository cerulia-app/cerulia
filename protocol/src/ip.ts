export interface ParsedIpLiteral {
	family: 4 | 6;
	bytes: Uint8Array;
}

function stripIpv6Decorations(input: string): string {
	const bracketless =
		input.startsWith("[") && input.endsWith("]")
			? input.slice(1, -1)
			: input;
	const zoneIndex = bracketless.indexOf("%");
	return zoneIndex >= 0 ? bracketless.slice(0, zoneIndex) : bracketless;
}

function parseIpv4(input: string): Uint8Array | null {
	const parts = input.split(".");
	if (parts.length !== 4) {
		return null;
	}

	const octets = parts.map((part) => {
		if (!/^\d{1,3}$/.test(part)) {
			return Number.NaN;
		}

		return Number.parseInt(part, 10);
	});
	if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
		return null;
	}

	return Uint8Array.from(octets);
}

function parseIpv6(input: string): Uint8Array | null {
	let normalized = stripIpv6Decorations(input).toLowerCase();
	if (normalized.length === 0) {
		return null;
	}

	if (normalized.includes(".")) {
		const lastColon = normalized.lastIndexOf(":");
		if (lastColon < 0) {
			return null;
		}

		const ipv4Tail = parseIpv4(normalized.slice(lastColon + 1));
		if (!ipv4Tail) {
			return null;
		}

		const tailGroups = [
			((ipv4Tail[0] ?? 0) << 8) | (ipv4Tail[1] ?? 0),
			((ipv4Tail[2] ?? 0) << 8) | (ipv4Tail[3] ?? 0),
		].map((value) => value.toString(16));
		normalized = `${normalized.slice(0, lastColon)}:${tailGroups.join(":")}`;
	}

	const halves = normalized.split("::");
	if (halves.length > 2) {
		return null;
	}

	const left = halves[0] ? halves[0].split(":") : [];
	const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
	if ([...left, ...right].some((part) => part.length === 0)) {
		return null;
	}

	const explicitGroupCount = left.length + right.length;
	if (halves.length === 1 && explicitGroupCount !== 8) {
		return null;
	}
	if (halves.length === 2 && explicitGroupCount >= 8) {
		return null;
	}

	const missingGroups = halves.length === 2 ? 8 - explicitGroupCount : 0;
	const groups = [
		...left,
		...new Array(missingGroups).fill("0"),
		...right,
	];
	if (groups.length !== 8) {
		return null;
	}

	const bytes = new Uint8Array(16);
	for (const [index, group] of groups.entries()) {
		if (!/^[0-9a-f]{1,4}$/.test(group)) {
			return null;
		}

		const value = Number.parseInt(group, 16);
		bytes[index * 2] = (value >> 8) & 0xff;
		bytes[index * 2 + 1] = value & 0xff;
	}

	return bytes;
}

function isPrivateIpv4(bytes: Uint8Array): boolean {
	const first = bytes[0] ?? 0;
	const second = bytes[1] ?? 0;

	return (
		first === 0 ||
		first === 10 ||
		(first === 100 && second >= 64 && second <= 127) ||
		first === 127 ||
		(first === 169 && second === 254) ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 0) ||
		(first === 192 && second === 88 && (bytes[2] ?? 0) === 99) ||
		(first === 192 && second === 168) ||
		(first === 198 && second >= 18 && second <= 19) ||
		(first === 192 && second === 0 && (bytes[2] ?? 0) === 2) ||
		(first === 198 && second === 51 && (bytes[2] ?? 0) === 100) ||
		(first === 203 && second === 0 && (bytes[2] ?? 0) === 113) ||
		first >= 224
	);
}

function isMappedIpv4(bytes: Uint8Array): boolean {
	return (
		bytes.slice(0, 10).every((value) => value === 0) &&
		((bytes[10] === 0 && bytes[11] === 0) ||
			(bytes[10] === 0xff && bytes[11] === 0xff))
	);
}

function isPrivateIpv6(bytes: Uint8Array): boolean {
	if (isMappedIpv4(bytes)) {
		return isPrivateIpv4(bytes.slice(12));
	}

	const first = ((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0);
	const second = ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0);
	const third = ((bytes[4] ?? 0) << 8) | (bytes[5] ?? 0);
	const fourth = ((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0);

	const isUnspecified = bytes.every((value) => value === 0);
	const isLoopback =
		bytes.slice(0, 15).every((value) => value === 0) && bytes[15] === 1;

	return (
		isUnspecified ||
		isLoopback ||
		(first & 0xfe00) === 0xfc00 ||
		(first & 0xffc0) === 0xfe80 ||
		(first & 0xffc0) === 0xfec0 ||
		(first & 0xff00) === 0xff00 ||
		(first === 0x2001 && second === 0x0db8) ||
		(first === 0x2001 && second === 0x0002 && third === 0x0000) ||
		(first === 0x0100 && second === 0x0000 && third === 0x0000 && fourth === 0x0000)
	);
}

export function parseIpLiteral(input: string): ParsedIpLiteral | null {
	const ipv4 = parseIpv4(input);
	if (ipv4) {
		return {
			family: 4,
			bytes: ipv4,
		};
	}

	const ipv6 = parseIpv6(input);
	if (ipv6) {
		return {
			family: 6,
			bytes: ipv6,
		};
	}

	return null;
}

export function sameIpLiteral(left: string, right: string): boolean {
	const parsedLeft = parseIpLiteral(left);
	const parsedRight = parseIpLiteral(right);
	if (!parsedLeft || !parsedRight || parsedLeft.family !== parsedRight.family) {
		return false;
	}

	return parsedLeft.bytes.every((value, index) => value === parsedRight.bytes[index]);
}

export function isPubliclyRoutableIpLiteral(input: string): boolean {
	const parsed = parseIpLiteral(input);
	if (!parsed) {
		return false;
	}

	return parsed.family === 4
		? !isPrivateIpv4(parsed.bytes)
		: !isPrivateIpv6(parsed.bytes);
}

export function selectPinnedPublicAddress(addresses: string[]): string {
	if (addresses.length === 0) {
		throw new Error("PDS endpoint host could not be resolved");
	}

	for (const address of addresses) {
		if (!isPubliclyRoutableIpLiteral(address)) {
			throw new Error(
				"PDS endpoint host must resolve only to public IP addresses",
			);
		}
	}

	return addresses[0] ?? "";
}