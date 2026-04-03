package contract

func document(id string, defs map[string]any) map[string]any {
	return map[string]any{
		"lexicon": 1,
		"id":      id,
		"defs":    defs,
	}
}

func stringDef(format string) map[string]any {
	definition := map[string]any{"type": "string"}
	if format != "" {
		definition["format"] = format
	}

	return definition
}

func booleanDef() map[string]any {
	return map[string]any{"type": "boolean"}
}

func integerDef() map[string]any {
	return map[string]any{"type": "integer"}
}

func refDef(ref string) map[string]any {
	return map[string]any{
		"type": "ref",
		"ref":  ref,
	}
}

func unionRefs(refs ...string) map[string]any {
	return map[string]any{
		"type":   "union",
		"closed": true,
		"refs":   refs,
	}
}

func enumDef(values ...string) map[string]any {
	return map[string]any{
		"type": "string",
		"enum": values,
	}
}

func arrayDef(item any) map[string]any {
	return map[string]any{
		"type":  "array",
		"items": item,
	}
}

func arrayDefMin(item any, minLength int) map[string]any {
	definition := arrayDef(item)
	if minLength > 0 {
		definition["minLength"] = minLength
	}

	return definition
}

func objectDef(required []string, properties map[string]any) map[string]any {
	definition := map[string]any{
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		definition["required"] = required
	}

	return definition
}

func jsonBody(schema map[string]any) map[string]any {
	return map[string]any{
		"encoding": "application/json",
		"schema":   schema,
	}
}

func recordMain(key string, required []string, properties map[string]any) map[string]any {
	return map[string]any{
		"type":   "record",
		"key":    key,
		"record": objectDef(required, properties),
	}
}

func queryMain(parameterRequired []string, parameters map[string]any, outputSchema map[string]any, errors []string) map[string]any {
	parameterSchema := map[string]any{
		"type":       "params",
		"properties": parameters,
	}
	if len(parameterRequired) > 0 {
		parameterSchema["required"] = parameterRequired
	}

	definition := map[string]any{
		"type":       "query",
		"parameters": parameterSchema,
		"output":     jsonBody(outputSchema),
	}
	if len(errors) > 0 {
		definition["errors"] = lexiconErrors(errors...)
	}

	return definition
}

func procedureMain(inputRequired []string, inputProperties map[string]any, outputSchema map[string]any, errors []string) map[string]any {
	definition := map[string]any{
		"type":   "procedure",
		"input":  jsonBody(objectDef(inputRequired, inputProperties)),
		"output": jsonBody(outputSchema),
	}
	if len(errors) > 0 {
		definition["errors"] = lexiconErrors(errors...)
	}

	return definition
}

func permissionSetDoc(id string, lxm ...string) map[string]any {
	return document(id, map[string]any{
		"main": map[string]any{
			"type": "permission-set",
			"permissions": []map[string]any{{
				"type":       "permission",
				"resource":   "rpc",
				"inheritAud": true,
				"lxm":        lxm,
			}},
		},
	})
}

func lexiconErrors(names ...string) []map[string]string {
	if len(names) == 0 {
		return nil
	}

	errors := make([]map[string]string, 0, len(names))
	for _, name := range names {
		errors = append(errors, map[string]string{"name": name})
	}

	return errors
}

func stableRecord(id string, required []string, properties map[string]any) map[string]any {
	return document(id, map[string]any{"main": recordMain("any", required, properties)})
}

func appendOnlyRecord(id string, required []string, properties map[string]any) map[string]any {
	return document(id, map[string]any{"main": recordMain("tid", required, properties)})
}
