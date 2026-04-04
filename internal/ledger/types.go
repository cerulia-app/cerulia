package ledger

import (
	"encoding/json"
	"time"
)

type MutationResultKind string

const (
	ResultAccepted     MutationResultKind = "accepted"
	ResultRejected     MutationResultKind = "rejected"
	ResultRebaseNeeded MutationResultKind = "rebase-needed"
)

type MutationAck struct {
	RequestID         string             `json:"requestId"`
	ResultKind        MutationResultKind `json:"resultKind"`
	EmittedRecordRefs []string           `json:"emittedRecordRefs,omitempty"`
	CurrentRevision   *int64             `json:"currentRevision,omitempty"`
	PublicationRef    string             `json:"publicationRef,omitempty"`
	Message           string             `json:"message,omitempty"`
}

type ServiceLogEntry struct {
	RequestID         string             `json:"requestId"`
	OperationNSID     string             `json:"operationNsid"`
	GoverningRef      string             `json:"governingRef"`
	ActorDID          string             `json:"actorDid,omitempty"`
	ResultKind        MutationResultKind `json:"resultKind"`
	ReasonCode        string             `json:"reasonCode,omitempty"`
	Message           string             `json:"message,omitempty"`
	EmittedRecordRefs []string           `json:"emittedRecordRefs,omitempty"`
	CreatedAt         time.Time          `json:"createdAt"`
	RawPayload        json.RawMessage    `json:"rawPayload,omitempty"`
	RedactedPayload   json.RawMessage    `json:"redactedPayload,omitempty"`
}
