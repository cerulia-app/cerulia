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
	ResultManualReview MutationResultKind = "manual-review"
)

type MutationAck struct {
	RequestID             string             `json:"requestId"`
	ResultKind            MutationResultKind `json:"resultKind"`
	EmittedRecordRefs     []string           `json:"emittedRecordRefs,omitempty"`
	CurrentRevision       *int64             `json:"currentRevision,omitempty"`
	CurrentState          string             `json:"currentState,omitempty"`
	CurrentVisibility     string             `json:"currentVisibility,omitempty"`
	CaseRevision          *int64             `json:"caseRevision,omitempty"`
	ReviewRevision        *int64             `json:"reviewRevision,omitempty"`
	SnapshotRef           string             `json:"snapshotRef,omitempty"`
	PublicationRef        string             `json:"publicationRef,omitempty"`
	SessionPublicationRef string             `json:"sessionPublicationRef,omitempty"`
	KeyVersion            *int64             `json:"keyVersion,omitempty"`
	UpdatedGrantRefs      []string           `json:"updatedGrantRefs,omitempty"`
	ControllerDids        []string           `json:"controllerDids,omitempty"`
	PendingControllerDids []string           `json:"pendingControllerDids,omitempty"`
	LeaseHolderDid        string             `json:"leaseHolderDid,omitempty"`
	TransferPhase         string             `json:"transferPhase,omitempty"`
	TransferCompletedAt   string             `json:"transferCompletedAt,omitempty"`
	Message               string             `json:"message,omitempty"`
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

type AuditEntry struct {
	RequestID         string             `json:"requestId"`
	OperationNSID     string             `json:"operationNsid"`
	GoverningRef      string             `json:"governingRef"`
	ActorDID          string             `json:"actorDid,omitempty"`
	ResultKind        MutationResultKind `json:"resultKind"`
	ReasonCode        string             `json:"reasonCode,omitempty"`
	Message           string             `json:"message,omitempty"`
	EmittedRecordRefs []string           `json:"emittedRecordRefs,omitempty"`
	CreatedAt         time.Time          `json:"createdAt"`
	Payload           json.RawMessage    `json:"payload,omitempty"`
}

func (entry ServiceLogEntry) AuditView() AuditEntry {
	return AuditEntry{
		RequestID:         entry.RequestID,
		OperationNSID:     entry.OperationNSID,
		GoverningRef:      entry.GoverningRef,
		ActorDID:          entry.ActorDID,
		ResultKind:        entry.ResultKind,
		ReasonCode:        entry.ReasonCode,
		Message:           entry.Message,
		EmittedRecordRefs: append([]string(nil), entry.EmittedRecordRefs...),
		CreatedAt:         entry.CreatedAt,
		Payload:           append(json.RawMessage(nil), entry.RedactedPayload...),
	}
}
