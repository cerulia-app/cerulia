package httpserver

import (
	"encoding/json"
	"net/http"
	"testing"

	"cerulia/internal/authz"
	"cerulia/internal/platform/database"
)

func TestRuntimeMutationHTTPFlow(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef, gmAudienceRef := createSessionDraftWithAudience(t, handler, "did:plc:gm1", "req-runtime-http")
	inviteAndJoinPlayer(t, handler, sessionRef, "did:plc:player1")
	openAndStartSession(t, handler, sessionRef)
	baseSheetRef := importCharacterSheet(t, handler, "did:plc:player1", "req-runtime-sheet-http")
	instanceRef, controllerAudienceRef := createCharacterInstanceHTTP(t, handler, sessionRef, baseSheetRef)

	envelopeRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createSecretEnvelope", `{"sessionRef":"`+sessionRef+`","audienceRef":"`+gmAudienceRef+`","payloadType":"gm-note","cipherSuite":"xchacha20poly1305","contentRef":"https://blob.example/gm-note-1","contentDigest":"sha256:gm-note-1","requestId":"req-envelope-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.SecretOperator,
	})
	if envelopeRec.Code != http.StatusOK {
		t.Fatalf("create secret envelope failed: %d %s", envelopeRec.Code, envelopeRec.Body.String())
	}
	var envelopeAck struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(envelopeRec.Body.Bytes(), &envelopeAck); err != nil {
		t.Fatalf("decode secret envelope ack: %v", err)
	}

	messageRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.sendMessage", `{"sessionRef":"`+sessionRef+`","channelKind":"table","bodyText":"message from player","requestId":"req-message-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:player1",
		authz.HeaderPermissionSets: authz.SessionParticipant,
	})
	if messageRec.Code != http.StatusOK {
		t.Fatalf("send message failed: %d %s", messageRec.Code, messageRec.Body.String())
	}
	stateRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.updateCharacterState", `{"sessionRef":"`+sessionRef+`","characterInstanceRef":"`+instanceRef+`","expectedRevision":0,"publicResources":{"hp":18},"privateStateEnvelopeRef":"`+envelopeAck.EmittedRecordRefs[0]+`","requestId":"req-state-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if stateRec.Code != http.StatusOK {
		t.Fatalf("update character state failed: %d %s", stateRec.Code, stateRec.Body.String())
	}

	rollRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.rollDice", `{"sessionRef":"`+sessionRef+`","command":"1d20+4","requestId":"req-roll-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:player1",
		authz.HeaderPermissionSets: authz.SessionParticipant,
	})
	if rollRec.Code != http.StatusOK {
		t.Fatalf("roll dice failed: %d %s", rollRec.Code, rollRec.Body.String())
	}

	revealRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.revealSubject", `{"sessionRef":"`+sessionRef+`","subjectRef":"`+envelopeAck.EmittedRecordRefs[0]+`","fromAudienceRef":"`+gmAudienceRef+`","toAudienceRef":"`+gmAudienceRef+`","revealMode":"broaden-audience","requestId":"req-reveal-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.SecretOperator,
	})
	if revealRec.Code != http.StatusOK {
		t.Fatalf("reveal subject failed: %d %s", revealRec.Code, revealRec.Body.String())
	}
	rotateRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.rotateAudienceKey", `{"sessionRef":"`+sessionRef+`","audienceRef":"`+controllerAudienceRef+`","expectedKeyVersion":1,"requestId":"req-rotate-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.SecretOperator,
	})
	if rotateRec.Code != http.StatusOK {
		t.Fatalf("rotate audience key failed: %d %s", rotateRec.Code, rotateRec.Body.String())
	}
	actionRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.submitAction", `{"sessionRef":"`+sessionRef+`","actionKind":"resolve-check","requestId":"req-action-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if actionRec.Code != http.StatusOK {
		t.Fatalf("submit action failed: %d %s", actionRec.Code, actionRec.Body.String())
	}
}

func importCharacterSheet(t *testing.T, handler http.Handler, actorDid string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.importCharacterSheet", `{"ownerDid":"`+actorDid+`","rulesetNsid":"app.cerulia.rules.core","displayName":"Hero","requestId":"`+requestID+`"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.CoreWriter,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("import character sheet failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode import character sheet ack: %v", err)
	}
	return ack.EmittedRecordRefs[0]
}

func createCharacterInstanceHTTP(t *testing.T, handler http.Handler, sessionRef string, baseSheetRef string) (string, string) {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCharacterInstance", `{"sessionRef":"`+sessionRef+`","instanceId":"hero-main","baseSheetRef":"`+baseSheetRef+`","instanceLabel":"Hero","sourceType":"player-character","controllerDids":["did:plc:gm1"],"requestId":"req-instance-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("create character instance failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode create character instance ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) < 2 {
		t.Fatalf("expected instance and controller audience refs, got %v", ack.EmittedRecordRefs)
	}
	return ack.EmittedRecordRefs[0], ack.EmittedRecordRefs[1]
}

func createSessionDraftWithAudience(t *testing.T, handler http.Handler, actorDid string, requestID string) (string, string) {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createSessionDraft", `{"sessionId":"session-`+requestID+`","title":"Session","visibility":"unlisted","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","controllerDids":["`+actorDid+`"],"recoveryControllerDids":["did:plc:recovery1"],"transferPolicy":"majority-controllers","expectedRulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","requestId":"`+requestID+`"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("create session failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode create session ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) < 3 {
		t.Fatalf("expected session, authority, audience refs, got %v", ack.EmittedRecordRefs)
	}
	return ack.EmittedRecordRefs[0], ack.EmittedRecordRefs[2]
}

func inviteAndJoinPlayer(t *testing.T, handler http.Handler, sessionRef string, actorDid string) {
	t.Helper()
	inviteRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.inviteSession", `{"sessionRef":"`+sessionRef+`","actorDid":"`+actorDid+`","role":"player","requestId":"req-invite-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if inviteRec.Code != http.StatusOK {
		t.Fatalf("invite player failed: %d %s", inviteRec.Code, inviteRec.Body.String())
	}
	joinRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.joinSession", `{"sessionRef":"`+sessionRef+`","actorDid":"`+actorDid+`","expectedStatus":"invited","requestId":"req-join-http"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.SessionParticipant,
	})
	if joinRec.Code != http.StatusOK {
		t.Fatalf("join player failed: %d %s", joinRec.Code, joinRec.Body.String())
	}
}

func openAndStartSession(t *testing.T, handler http.Handler, sessionRef string) {
	t.Helper()
	openRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.openSession", `{"sessionRef":"`+sessionRef+`","expectedState":"planning","requestId":"req-open-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if openRec.Code != http.StatusOK {
		t.Fatalf("open session failed: %d %s", openRec.Code, openRec.Body.String())
	}
	startRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.startSession", `{"sessionRef":"`+sessionRef+`","expectedState":"open","requestId":"req-start-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if startRec.Code != http.StatusOK {
		t.Fatalf("start session failed: %d %s", startRec.Code, startRec.Body.String())
	}
}
