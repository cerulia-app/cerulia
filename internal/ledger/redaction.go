package ledger

import "encoding/json"

var sensitivePayloadKeys = map[string]struct{}{
	"bodyText":                {},
	"contentDigest":           {},
	"contentRef":              {},
	"deltaPayloadRef":         {},
	"detailEnvelopeRef":       {},
	"detailPayload":           {},
	"externalSheetUri":        {},
	"note":                    {},
	"privateStateEnvelopeRef": {},
	"publicProfile":           {},
	"secretEnvelopeRef":       {},
	"stats":                   {},
	"wrappedKey":              {},
}

func RedactPayload(payload json.RawMessage) json.RawMessage {
	if len(payload) == 0 {
		return nil
	}
	var decoded any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return nil
	}
	redacted, err := json.Marshal(redactValue(decoded))
	if err != nil {
		return nil
	}
	return redacted
}

func redactValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		redacted := make(map[string]any, len(typed))
		for key, item := range typed {
			if _, ok := sensitivePayloadKeys[key]; ok {
				continue
			}
			redacted[key] = redactValue(item)
		}
		return redacted
	case []any:
		redacted := make([]any, 0, len(typed))
		for _, item := range typed {
			redacted = append(redacted, redactValue(item))
		}
		return redacted
	default:
		return typed
	}
}
