import { json, type RequestEvent } from "@sveltejs/kit";
import { createCeruliaAuthHeaders } from "$lib/server/cerulia-auth";
import {
	getCeruliaApiBaseUrl,
	getCeruliaProjectionBaseUrl,
} from "$lib/server/cerulia-runtime";

type CeruliaService = "api" | "projection";

function getBaseUrl(service: CeruliaService) {
	return service === "api"
		? getCeruliaApiBaseUrl()
		: getCeruliaProjectionBaseUrl();
}

export async function requestCeruliaJson(
	event: RequestEvent,
	service: CeruliaService,
	path: string,
	init: RequestInit = {},
) {
	const headers = new Headers(init.headers);
	headers.set("accept", "application/json");
	const method = init.method ?? "GET";
	const requestUrl = `${getBaseUrl(service)}${path}`;

	for (const [name, value] of Object.entries(
		await createCeruliaAuthHeaders(
			event.locals.ceruliaViewerAuth,
			service === "api" ? requestUrl : undefined,
			method,
			init.body,
		),
	)) {
		if (value.length > 0) {
			headers.set(name, value);
		}
	}

	if (init.body && !headers.has("content-type")) {
		headers.set("content-type", "application/json");
	}

	return event.fetch(requestUrl, {
		...init,
		headers,
	});
}

export async function proxyCeruliaJson(
	event: RequestEvent,
	service: CeruliaService,
	path: string,
	init: RequestInit = {},
) {
	const response = await requestCeruliaJson(event, service, path, init);
	const payload = await response.json();
	return json(payload, { status: response.status });
}
