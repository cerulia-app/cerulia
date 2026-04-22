export function isCredentialFreeUri(value: string): boolean {
	let url: URL;

	try {
		url = new URL(value);
	} catch {
		return false;
	}

	if (url.protocol !== "https:" && url.protocol !== "http:") {
		return false;
	}

	if (url.username || url.password) {
		return false;
	}

	return url.search.length === 0 && url.hash.length === 0;
}
