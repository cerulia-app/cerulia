import { lexicons, validateById } from "@cerulia/protocol";

function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObjectOutputSchema(
	schema: unknown,
): schema is {
	properties?: Record<string, unknown>;
	required?: string[];
} {
	return isPlainObject(schema) && schema.type === "object";
}

function splitLexiconUri(lexiconUri: string): {
	lexiconId: string;
	defId: string;
} {
	const normalizedUri = lexiconUri.startsWith("lex:")
		? lexiconUri.slice("lex:".length)
		: lexiconUri;
	const [lexiconId, defId = "main", ...rest] = normalizedUri.split("#");
	if (!lexiconId || rest.length > 0) {
		throw new Error(`Invalid lexicon uri: ${lexiconUri}`);
	}

	return {
		lexiconId,
		defId,
	};
}

function assertTypedValuesAreValid(value: unknown): void {
	if (Array.isArray(value)) {
		for (const item of value) {
			assertTypedValuesAreValid(item);
		}
		return;
	}

	if (!isPlainObject(value)) {
		return;
	}

	if (typeof value.$type === "string") {
		const [lexiconId, defId = "main", ...rest] = value.$type.split("#");
		if (!lexiconId || rest.length > 0) {
			throw new Error(`Invalid $type value in XRPC output: ${value.$type}`);
		}

		const result = validateById(value, lexiconId, defId, true);
		if (!result.success) {
			throw result.error;
		}
	}

	for (const nested of Object.values(value)) {
		assertTypedValuesAreValid(nested);
	}
}

function assertSchemaValueMatches(
	baseLexiconId: string,
	schema: unknown,
	value: unknown,
): void {
	if (value === undefined || !isPlainObject(schema)) {
		return;
	}

	if (schema.type === "ref" && typeof schema.ref === "string") {
		const resolvedUri = lexicons.resolveLexUri(baseLexiconId, schema.ref);
		const { lexiconId, defId } = splitLexiconUri(resolvedUri);
		const result = validateById(value, lexiconId, defId, true);
		if (!result.success) {
			throw result.error;
		}
		return;
	}

	if (schema.type === "array") {
		if (!Array.isArray(value)) {
			throw new Error(`XRPC output array field must be an array`);
		}

		for (const item of value) {
			assertSchemaValueMatches(baseLexiconId, schema.items, item);
		}
		return;
	}

	if (schema.type === "object") {
		if (!isPlainObject(value)) {
			throw new Error(`XRPC output object field must be an object`);
		}

		const requiredProperties = Array.isArray(schema.required)
			? schema.required
			: [];

		for (const requiredProperty of requiredProperties) {
			if (!(requiredProperty in value)) {
				throw new Error(
					`XRPC output object field is missing required property ${requiredProperty}`,
				);
			}
		}

		for (const [property, propertySchema] of Object.entries(
			schema.properties ?? {},
		)) {
			assertSchemaValueMatches(baseLexiconId, propertySchema, value[property]);
		}
	}
}

function assertFallbackXrpcOutputShape(
	lexiconId: string,
	payload: unknown,
): void {
	if (!isPlainObject(payload)) {
		throw new Error(`XRPC output for ${lexiconId} must be a JSON object`);
	}

	const definition = lexicons.getDefOrThrow(lexiconId, ["query", "procedure"]);
	const outputSchema = definition.output?.schema;
	if (!isObjectOutputSchema(outputSchema)) {
		throw new Error(`XRPC output for ${lexiconId} must use an object schema`);
	}

	const allowedProperties = new Set(Object.keys(outputSchema.properties ?? {}));
	const requiredProperties = outputSchema.required ?? [];

	for (const requiredProperty of requiredProperties) {
		if (!(requiredProperty in payload)) {
			throw new Error(
				`XRPC output for ${lexiconId} is missing required property ${requiredProperty}`,
			);
		}
	}

	for (const property of Object.keys(payload)) {
		if (!allowedProperties.has(property)) {
			throw new Error(
				`XRPC output for ${lexiconId} contains unexpected property ${property}`,
			);
		}
	}

	for (const [property, propertySchema] of Object.entries(
		outputSchema.properties ?? {},
	)) {
		assertSchemaValueMatches(lexiconId, propertySchema, payload[property]);
	}

	assertTypedValuesAreValid(payload);
}

export function assertValidXrpcOutputPayload(
	lexiconId: string,
	payload: unknown,
): void {
	try {
		lexicons.assertValidXrpcOutput(lexiconId, payload);
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Unexpected lexicon type: record")
		) {
			assertFallbackXrpcOutputShape(lexiconId, payload);
			return;
		}

		throw error;
	}
}

export function jsonXrpcOutput(
	context: { json: (payload: unknown) => Response },
	lexiconId: string,
	payload: unknown,
): Response {
	assertValidXrpcOutputPayload(lexiconId, payload);
	return context.json(payload);
}