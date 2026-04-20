import type {
	AppCeruliaCharacterGetBranchView,
	AppCeruliaCoreCharacterSheetSchema,
} from "@cerulia/protocol";

type FieldDef =
	| AppCeruliaCoreCharacterSheetSchema.FieldDefRoot
	| AppCeruliaCoreCharacterSheetSchema.FieldDefNode
	| AppCeruliaCoreCharacterSheetSchema.FieldDefAdditional;

interface ValidationOptions {
	partial: boolean;
}

function additionalFieldDefFor(field: FieldDef) {
	return "additionalFieldDef" in field ? field.additionalFieldDef : undefined;
}

function isExtensibleGroup(field: FieldDef): boolean {
	return (
		field.fieldType === "group" &&
		"extensible" in field &&
		field.extensible === true
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateScalar(
	value: unknown,
	field: FieldDef,
	path: string,
): string | null {
	switch (field.fieldType) {
		case "integer": {
			if (!Number.isInteger(value)) {
				return `${path} must be an integer`;
			}

			if (
				typeof field.valueRange?.min === "number" &&
				(value as number) < field.valueRange.min
			) {
				return `${path} must be >= ${field.valueRange.min}`;
			}

			if (
				typeof field.valueRange?.max === "number" &&
				(value as number) > field.valueRange.max
			) {
				return `${path} must be <= ${field.valueRange.max}`;
			}

			return null;
		}

		case "string":
			return typeof value === "string" ? null : `${path} must be a string`;

		case "boolean":
			return typeof value === "boolean" ? null : `${path} must be a boolean`;

		case "enum": {
			if (typeof value !== "string") {
				return `${path} must be a string enum value`;
			}

			const values = field.valueRange?.enumValues;
			if (values && !values.includes(value)) {
				return `${path} must be one of the declared enum values`;
			}

			return null;
		}

		default:
			return `${path} uses an unsupported field type`;
	}
}

function validateField(
	value: unknown,
	field: FieldDef,
	path: string,
	options: ValidationOptions,
): string | null {
	if (value === undefined) {
		return options.partial || !field.required ? null : `${path} is required`;
	}

	switch (field.fieldType) {
		case "group": {
			if (!isPlainObject(value)) {
				return `${path} must be an object`;
			}

			const children = field.children ?? [];
			const childMap = new Map(children.map((child) => [child.fieldId, child]));

			for (const child of children) {
				const err = validateField(
					value[child.fieldId],
					child,
					`${path}.${child.fieldId}`,
					options,
				);
				if (err) {
					return err;
				}
			}

			for (const [key, nestedValue] of Object.entries(value)) {
				const child = childMap.get(key);
				if (child) {
					continue;
				}

				const additionalFieldDef = additionalFieldDefFor(field);
				if (!isExtensibleGroup(field) || !additionalFieldDef) {
					return `${path}.${key} is not declared by the schema`;
				}

				const err = validateField(
					nestedValue,
					additionalFieldDef,
					`${path}.${key}`,
					{
						partial: false,
					},
				);
				if (err) {
					return err;
				}
			}

			return null;
		}

		case "array": {
			if (!Array.isArray(value)) {
				return `${path} must be an array`;
			}

			if (!field.itemDef) {
				return `${path} is missing an item definition`;
			}

			for (const [index, entry] of value.entries()) {
				const err = validateField(entry, field.itemDef, `${path}[${index}]`, {
					partial: false,
				});
				if (err) {
					return err;
				}
			}

			return null;
		}

		default:
			return validateScalar(value, field, path);
	}
}

export function validateStatsAgainstSchema(
	stats: unknown,
	fieldDefs: AppCeruliaCoreCharacterSheetSchema.FieldDefRoot[],
	partial = false,
): string | null {
	if (!isPlainObject(stats)) {
		return "stats must be an object";
	}

	const fieldMap = new Map(fieldDefs.map((field) => [field.fieldId, field]));
	const options = { partial };

	for (const field of fieldDefs) {
		const err = validateField(
			stats[field.fieldId],
			field,
			field.fieldId,
			options,
		);
		if (err) {
			return err;
		}
	}

	for (const [key, value] of Object.entries(stats)) {
		const field = fieldMap.get(key);
		if (!field) {
			return `${key} is not declared by the schema`;
		}

		const err = validateField(value, field, key, options);
		if (err) {
			return err;
		}
	}

	return null;
}

export function mergeJsonObject(
	baseValue: unknown,
	patchValue: unknown,
): unknown {
	if (patchValue === undefined) {
		return baseValue;
	}

	if (!isPlainObject(baseValue) || !isPlainObject(patchValue)) {
		return patchValue;
	}

	const result: Record<string, unknown> = { ...baseValue };

	for (const [key, nestedPatch] of Object.entries(patchValue)) {
		result[key] = mergeJsonObject(result[key], nestedPatch);
	}

	return result;
}

function toStatValue(
	field: FieldDef,
	value: unknown,
): AppCeruliaCharacterGetBranchView.StatValue | null {
	switch (field.fieldType) {
		case "integer":
			return typeof value === "number"
				? {
						$type: "app.cerulia.character.getBranchView#statValue",
						valueKind: "integer",
						numberValue: value,
					}
				: null;

		case "string":
			return typeof value === "string"
				? {
						$type: "app.cerulia.character.getBranchView#statValue",
						valueKind: "string",
						textValue: value,
					}
				: null;

		case "boolean":
			return typeof value === "boolean"
				? {
						$type: "app.cerulia.character.getBranchView#statValue",
						valueKind: "boolean",
						boolValue: value,
					}
				: null;

		case "enum":
			return typeof value === "string"
				? {
						$type: "app.cerulia.character.getBranchView#statValue",
						valueKind: "enum",
						enumValue: value,
					}
				: null;

		default:
			return null;
	}
}

function flattenField(
	field: FieldDef,
	value: unknown,
	path: string,
	entries: AppCeruliaCharacterGetBranchView.StatEntry[],
): void {
	if (value === undefined) {
		return;
	}

	switch (field.fieldType) {
		case "group": {
			if (!isPlainObject(value)) {
				return;
			}

			const childMap = new Map(
				(field.children ?? []).map((child) => [child.fieldId, child]),
			);
			for (const [key, nestedValue] of Object.entries(value)) {
				const child = childMap.get(key) ?? additionalFieldDefFor(field);
				if (!child) {
					continue;
				}

				flattenField(child, nestedValue, `${path}.${key}`, entries);
			}

			return;
		}

		case "array": {
			if (!Array.isArray(value) || !field.itemDef) {
				return;
			}

			value.forEach((entry, index) => {
				flattenField(
					field.itemDef as FieldDef,
					entry,
					`${path}[${index}]`,
					entries,
				);
			});

			return;
		}

		default: {
			const statValue = toStatValue(field, value);
			if (!statValue) {
				return;
			}

			entries.push({
				$type: "app.cerulia.character.getBranchView#statEntry",
				fieldId: path,
				label: field.label,
				value: statValue,
			});
		}
	}
}

export function flattenStructuredStats(
	fieldDefs: AppCeruliaCoreCharacterSheetSchema.FieldDefRoot[],
	stats: unknown,
): AppCeruliaCharacterGetBranchView.StatEntry[] {
	if (!isPlainObject(stats)) {
		return [];
	}

	const entries: AppCeruliaCharacterGetBranchView.StatEntry[] = [];
	for (const field of fieldDefs) {
		flattenField(field, stats[field.fieldId], field.fieldId, entries);
	}

	return entries;
}
