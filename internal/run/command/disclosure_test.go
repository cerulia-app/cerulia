package command

import (
	"context"
	"testing"
	"time"

	"cerulia/internal/ledger"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

func TestCreateSessionDraftCreatesGMGrant_Sprint2(t *testing.T) {
	service := NewService(nil)
	ack, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-grants",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		ControllerDids:             []string{"did:plc:gm1"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		ExpectedRulesetManifestRef: "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		RequestID:                  "req-create-session-grants",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 3 {
		t.Fatalf("expected 3 emitted refs, got %v", ack.EmittedRecordRefs)
	}
	grants, err := service.listAudienceGrantRecords(context.Background(), service.store, ack.EmittedRecordRefs[2])
	if err != nil {
		t.Fatalf("list audience grants: %v", err)
	}
	if len(grants) != 1 {
		t.Fatalf("expected one gm grant, got %d", len(grants))
	}
	if grants[0].value.ActorDid != "did:plc:gm1" || grants[0].value.GrantStatus != "active" || grants[0].value.KeyVersion != 1 {
		t.Fatalf("unexpected gm grant: %+v", grants[0].value)
	}
}

func TestRotateAudienceKeyUpdatesGrantVersion_Sprint2(t *testing.T) {
	service, sessionRef, gmAudienceRef := createDisclosureReadySession(t)
	ack, err := service.RotateAudienceKey(context.Background(), "did:plc:gm1", RotateAudienceKeyInput{
		SessionRef:         sessionRef,
		AudienceRef:        gmAudienceRef,
		ExpectedKeyVersion: 1,
		RequestID:          "req-rotate-audience",
	})
	if err != nil {
		t.Fatalf("rotate audience key: %v", err)
	}
	if ack.ResultKind != ledger.ResultAccepted || ack.KeyVersion == nil || *ack.KeyVersion != 2 {
		t.Fatalf("unexpected rotate ack: %+v", ack)
	}
	grants, err := service.listAudienceGrantRecords(context.Background(), service.store, gmAudienceRef)
	if err != nil {
		t.Fatalf("list audience grants: %v", err)
	}
	if len(grants) != 1 || grants[0].value.KeyVersion != 2 || grants[0].value.GrantStatus != "active" {
		t.Fatalf("unexpected rotated grants: %+v", grants)
	}
	_, audience, err := service.requireAudienceForSession(context.Background(), service.store, sessionRef, gmAudienceRef)
	if err != nil {
		t.Fatalf("load audience: %v", err)
	}
	audience.RequestID = "req-retire-audience"
	audience.Status = audienceStatusRetired
	audience.UpdatedByDid = "did:plc:gm1"
	audience.UpdatedAt = audience.UpdatedAt.Add(time.Minute)
	record, err := service.store.GetStable(context.Background(), gmAudienceRef)
	if err != nil {
		t.Fatalf("get audience record: %v", err)
	}
	storedAudience, err := marshalStable(runmodel.CollectionAudience, gmAudienceRef, audience.RequestID, record.Revision+1, record.CreatedAt, audience.UpdatedAt, audience)
	if err != nil {
		t.Fatalf("marshal audience: %v", err)
	}
	if err := service.store.WithTx(context.Background(), func(tx store.Tx) error {
		return tx.PutStable(context.Background(), storedAudience)
	}); err != nil {
		t.Fatalf("store retired audience: %v", err)
	}
	rejectedAck, err := service.RotateAudienceKey(context.Background(), "did:plc:gm1", RotateAudienceKeyInput{
		SessionRef:         sessionRef,
		AudienceRef:        gmAudienceRef,
		ExpectedKeyVersion: 2,
		RequestID:          "req-rotate-retired-audience",
	})
	if err != nil {
		t.Fatalf("rotate retired audience: %v", err)
	}
	if rejectedAck.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected retired audience rotation to be rejected, got %+v", rejectedAck)
	}
}

func TestSecretEnvelopeRevealAndRedactFlow_Sprint2(t *testing.T) {
	service, sessionRef, gmAudienceRef := createDisclosureReadySession(t)
	envelopeAck, err := service.CreateSecretEnvelope(context.Background(), "did:plc:gm1", CreateSecretEnvelopeInput{
		SessionRef:    sessionRef,
		AudienceRef:   gmAudienceRef,
		PayloadType:   "gm-note",
		CipherSuite:   "xchacha20poly1305",
		ContentRef:    "https://blob.example/gm-note-1",
		ContentDigest: "sha256:gm-note-1",
		RequestID:     "req-envelope-sprint2",
	})
	if err != nil {
		t.Fatalf("create secret envelope: %v", err)
	}
	envelopeRef := envelopeAck.EmittedRecordRefs[0]
	revealAck, err := service.RevealSubject(context.Background(), "did:plc:gm1", RevealSubjectInput{
		SessionRef:      sessionRef,
		SubjectRef:      envelopeRef,
		FromAudienceRef: gmAudienceRef,
		ToAudienceRef:   gmAudienceRef,
		RevealMode:      "broaden-audience",
		RequestID:       "req-reveal-sprint2",
	})
	if err != nil {
		t.Fatalf("reveal subject: %v", err)
	}
	if revealAck.ResultKind != ledger.ResultAccepted {
		t.Fatalf("unexpected reveal ack: %+v", revealAck)
	}
	mismatchAck, err := service.RevealSubject(context.Background(), "did:plc:gm1", RevealSubjectInput{
		SessionRef:    sessionRef,
		SubjectRef:    envelopeRef,
		ToAudienceRef: gmAudienceRef,
		RevealMode:    "broaden-audience",
		RequestID:     "req-reveal-mismatch-sprint2",
	})
	if err != nil {
		t.Fatalf("reveal subject mismatch: %v", err)
	}
	if mismatchAck.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected reveal mismatch to be rejected, got %+v", mismatchAck)
	}
	redactAck, err := service.RedactRecord(context.Background(), "did:plc:gm1", RedactRecordInput{
		SessionRef:    sessionRef,
		SubjectRef:    envelopeRef,
		RedactionMode: "hide",
		ReasonCode:    "cleanup",
		RequestID:     "req-redact-sprint2",
	})
	if err != nil {
		t.Fatalf("redact record: %v", err)
	}
	if redactAck.ResultKind != ledger.ResultAccepted {
		t.Fatalf("unexpected redact ack: %+v", redactAck)
	}
}

func createDisclosureReadySession(t *testing.T) (*Service, string, string) {
	t.Helper()
	service := NewService(nil)
	ack, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-disclosure",
		Title:                      "Disclosure Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		ControllerDids:             []string{"did:plc:gm1"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		ExpectedRulesetManifestRef: "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		RequestID:                  "req-create-session-disclosure",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := ack.EmittedRecordRefs[0]
	gmAudienceRef := ack.EmittedRecordRefs[2]
	if _, err := service.OpenSession(context.Background(), "did:plc:gm1", SessionStateInput{SessionRef: sessionRef, ExpectedState: "planning", RequestID: "req-open-disclosure"}); err != nil {
		t.Fatalf("open session: %v", err)
	}
	if _, err := service.StartSession(context.Background(), "did:plc:gm1", SessionStateInput{SessionRef: sessionRef, ExpectedState: "open", RequestID: "req-start-disclosure"}); err != nil {
		t.Fatalf("start session: %v", err)
	}
	return service, sessionRef, gmAudienceRef
}
