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