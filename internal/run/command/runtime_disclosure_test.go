package command

import (
	"context"
	"testing"

	corecommand "cerulia/internal/core/command"
	"cerulia/internal/ledger"
	runmodel "cerulia/internal/run/model"
)

func TestCreateSessionDraftCreatesGMGrant(t *testing.T) {
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

func TestRotateAudienceKeyUpdatesGrantVersion(t *testing.T) {
	service, sessionRef, gmAudienceRef := createJoinedActiveSession(t)
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
}

func TestCharacterStateAndDisclosureFlow(t *testing.T) {
	service, sessionRef, gmAudienceRef := createJoinedActiveSession(t)
	baseSheetRef := createBaseSheet(t, service, "did:plc:player1", "req-base-sheet-runtime")
	instanceAck, err := service.CreateCharacterInstance(context.Background(), "did:plc:gm1", CreateCharacterInstanceInput{
		SessionRef:     sessionRef,
		InstanceID:     "hero-main",
		BaseSheetRef:   baseSheetRef,
		InstanceLabel:  "Hero",
		SourceType:     "player-character",
		ControllerDids: []string{"did:plc:player1"},
		RequestID:      "req-create-instance-runtime",
	})
	if err != nil {
		t.Fatalf("create character instance: %v", err)
	}
	if len(instanceAck.EmittedRecordRefs) != 2 {
		t.Fatalf("expected instance and controller audience refs, got %v", instanceAck.EmittedRecordRefs)
	}
	instanceRef := instanceAck.EmittedRecordRefs[0]
	controllerAudienceRef := instanceAck.EmittedRecordRefs[1]

	envelopeAck, err := service.CreateSecretEnvelope(context.Background(), "did:plc:gm1", CreateSecretEnvelopeInput{
		SessionRef:    sessionRef,
		AudienceRef:   controllerAudienceRef,
		PayloadType:   "private-state",
		CipherSuite:   "xchacha20poly1305",
		ContentRef:    "https://blob.example/private-state-1",
		ContentDigest: "sha256:state-1",
		RequestID:     "req-create-envelope-runtime",
	})
	if err != nil {
		t.Fatalf("create secret envelope: %v", err)
	}
	envelopeRef := envelopeAck.EmittedRecordRefs[0]

	initiative := int64(12)
	stateAck, err := service.UpdateCharacterState(context.Background(), "did:plc:player1", UpdateCharacterStateInput{
		SessionRef:              sessionRef,
		CharacterInstanceRef:    instanceRef,
		ExpectedRevision:        0,
		PublicResources:         map[string]int64{"hp": 18},
		PublicStatuses:          []string{"ready"},
		PrivateStateEnvelopeRef: envelopeRef,
		Initiative:              &initiative,
		RequestID:               "req-update-state-runtime",
	})
	if err != nil {
		t.Fatalf("update character state: %v", err)
	}
	if stateAck.ResultKind != ledger.ResultAccepted || stateAck.CurrentRevision == nil || *stateAck.CurrentRevision != 1 {
		t.Fatalf("unexpected state ack: %+v", stateAck)
	}

	staleAck, err := service.UpdateCharacterState(context.Background(), "did:plc:player1", UpdateCharacterStateInput{
		SessionRef:           sessionRef,
		CharacterInstanceRef: instanceRef,
		ExpectedRevision:     0,
		RequestID:            "req-update-state-stale",
	})
	if err != nil {
		t.Fatalf("stale update should not error: %v", err)
	}
	if staleAck.ResultKind != ledger.ResultRebaseNeeded {
		t.Fatalf("expected rebase-needed for stale state update, got %+v", staleAck)
	}

	revealAck, err := service.RevealSubject(context.Background(), "did:plc:gm1", RevealSubjectInput{
		SessionRef:      sessionRef,
		SubjectRef:      envelopeRef,
		FromAudienceRef: controllerAudienceRef,
		ToAudienceRef:   gmAudienceRef,
		RevealMode:      "broaden-audience",
		RequestID:       "req-reveal-runtime",
	})
	if err != nil {
		t.Fatalf("reveal subject: %v", err)
	}
	if revealAck.ResultKind != ledger.ResultAccepted {
		t.Fatalf("unexpected reveal ack: %+v", revealAck)
	}

	redactAck, err := service.RedactRecord(context.Background(), "did:plc:gm1", RedactRecordInput{
		SessionRef:    sessionRef,
		SubjectRef:    envelopeRef,
		RedactionMode: "hide",
		ReasonCode:    "cleanup",
		RequestID:     "req-redact-runtime",
	})
	if err != nil {
		t.Fatalf("redact record: %v", err)
	}
	if redactAck.ResultKind != ledger.ResultAccepted {
		t.Fatalf("unexpected redact ack: %+v", redactAck)
	}
}

func TestMessageRollAndRulingFlow(t *testing.T) {
	service, sessionRef, _ := createJoinedActiveSession(t)
	messageAck, err := service.SendMessage(context.Background(), "did:plc:player1", SendMessageInput{
		SessionRef:  sessionRef,
		ChannelKind: "table",
		BodyText:    "探索を続行する。",
		RequestID:   "req-send-message-runtime",
	})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if messageAck.ResultKind != ledger.ResultAccepted || len(messageAck.EmittedRecordRefs) != 1 {
		t.Fatalf("unexpected message ack: %+v", messageAck)
	}

	rollAck, err := service.RollDice(context.Background(), "did:plc:player1", RollDiceInput{
		SessionRef: sessionRef,
		Command:    "2d6+1",
		RequestID:  "req-roll-runtime",
	})
	if err != nil {
		t.Fatalf("roll dice: %v", err)
	}
	if rollAck.ResultKind != ledger.ResultAccepted || len(rollAck.EmittedRecordRefs) != 1 {
		t.Fatalf("unexpected roll ack: %+v", rollAck)
	}
	_, roll, err := decodeRunAppend[runmodel.Roll](context.Background(), service.store, rollAck.EmittedRecordRefs[0])
	if err != nil {
		t.Fatalf("decode roll: %v", err)
	}
	if roll.ResultSummary == "" || roll.RNGVersion == "" {
		t.Fatalf("expected roll summary and rng version, got %+v", roll)
	}

	rulingAck, err := service.SubmitAction(context.Background(), "did:plc:gm1", SubmitActionInput{
		SessionRef: sessionRef,
		ActionKind: "resolve-check",
		RequestID:  "req-submit-action-runtime",
	})
	if err != nil {
		t.Fatalf("submit action: %v", err)
	}
	if rulingAck.ResultKind != ledger.ResultAccepted || len(rulingAck.EmittedRecordRefs) != 1 {
		t.Fatalf("unexpected ruling ack: %+v", rulingAck)
	}
}

func TestSendMessageRejectsArchivedSession(t *testing.T) {
	service, sessionRef, _ := createJoinedActiveSession(t)
	if _, err := service.CloseSession(context.Background(), "did:plc:gm1", SessionStateInput{SessionRef: sessionRef, ExpectedState: "active", RequestID: "req-close-runtime"}); err != nil {
		t.Fatalf("close session: %v", err)
	}
	if _, err := service.ArchiveSession(context.Background(), "did:plc:gm1", SessionStateInput{SessionRef: sessionRef, ExpectedState: "ended", RequestID: "req-archive-runtime"}); err != nil {
		t.Fatalf("archive session: %v", err)
	}
	ack, err := service.SendMessage(context.Background(), "did:plc:player1", SendMessageInput{
		SessionRef:  sessionRef,
		ChannelKind: "table",
		BodyText:    "archived message",
		RequestID:   "req-send-archived-runtime",
	})
	if err != nil {
		t.Fatalf("send message on archived session should not error: %v", err)
	}
	if ack.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected archived session message to be rejected, got %+v", ack)
	}
}

func createJoinedActiveSession(t *testing.T) (*Service, string, string) {
	t.Helper()
	service := NewService(nil)
	ack, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-runtime",
		Title:                      "Runtime Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		ControllerDids:             []string{"did:plc:gm1"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		ExpectedRulesetManifestRef: "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		RequestID:                  "req-create-session-runtime",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := ack.EmittedRecordRefs[0]
	gmAudienceRef := ack.EmittedRecordRefs[2]
	if _, err := service.InviteSession(context.Background(), "did:plc:gm1", InviteSessionInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", Role: "player", ExpectedStatus: "", RequestID: "req-invite-runtime"}); err != nil {
		t.Fatalf("invite player: %v", err)
	}
	if _, err := service.JoinSession(context.Background(), "did:plc:player1", JoinSessionInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", ExpectedStatus: "invited", RequestID: "req-join-runtime"}); err != nil {
		t.Fatalf("join player: %v", err)
	}
	if _, err := service.OpenSession(context.Background(), "did:plc:gm1", SessionStateInput{SessionRef: sessionRef, ExpectedState: "planning", RequestID: "req-open-runtime"}); err != nil {
		t.Fatalf("open session: %v", err)
	}
	if _, err := service.StartSession(context.Background(), "did:plc:gm1", SessionStateInput{SessionRef: sessionRef, ExpectedState: "open", RequestID: "req-start-runtime"}); err != nil {
		t.Fatalf("start session: %v", err)
	}
	return service, sessionRef, gmAudienceRef
}

func createBaseSheet(t *testing.T, service *Service, ownerDid string, requestID string) string {
	t.Helper()
	coreService := corecommand.NewService(service.store)
	ack, err := coreService.ImportCharacterSheet(context.Background(), ownerDid, corecommand.ImportCharacterSheetInput{
		OwnerDid:    ownerDid,
		RulesetNSID: "app.cerulia.rules.core",
		DisplayName: "Hero",
		RequestID:   requestID,
	})
	if err != nil {
		t.Fatalf("import character sheet: %v", err)
	}
	return ack.EmittedRecordRefs[0]
}
