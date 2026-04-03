package model

import (
	"encoding/json"
	"fmt"

	"cerulia/internal/store"
)

func Marshal(value any) (json.RawMessage, error) {
	payload, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("marshal record body: %w", err)
	}
	return payload, nil
}

func UnmarshalStable[T any](record store.StableRecord) (T, error) {
	var value T
	if err := json.Unmarshal(record.Body, &value); err != nil {
		return value, fmt.Errorf("decode stable record %s: %w", record.Ref, err)
	}
	return value, nil
}

func UnmarshalAppend[T any](record store.AppendRecord) (T, error) {
	var value T
	if err := json.Unmarshal(record.Body, &value); err != nil {
		return value, fmt.Errorf("decode append record %s: %w", record.Ref, err)
	}
	return value, nil
}
