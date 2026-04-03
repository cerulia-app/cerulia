package httpserver

import (
	"encoding/json"
	"net/http"
	"testing"

	"cerulia/internal/authz"
	"cerulia/internal/platform/database"
)

func TestDisclosureHTTPFlow_Sprint2(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef, gmAudienceRef := createDisclosureSessionHTTP(t, handler, "did:plc:gm1", "req-disclosure-http")

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

	revealRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.revealSubject", `{"sessionRef":"`+sessionRef+`","subjectRef":"`+envelopeAck.EmittedRecordRefs[0]+`","fromAudienceRef":"`+gmAudienceRef+`","toAudienceRef":"`+gmAudienceRef+`","revealMode":"broaden-audience","requestId":"req-reveal-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.SecretOperator,
	})
	if revealRec.Code != http.StatusOK {
		t.Fatalf("reveal subject failed: %d %s", revealRec.Code, revealRec.Body.String())
	}

	redactRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.redactRecord", `{"sessionRef":"`+sessionRef+`","subjectRef":"`+envelopeAck.EmittedRecordRefs[0]+`","redactionMode":"hide","reasonCode":"cleanup","requestId":"req-redact-http"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:gm1",
		authz.HeaderPermissionSets: authz.SecretOperator,
	})
	if redactRec.Code != http.StatusOK {
		t.Fatalf("redact record failed: %d %s", redactRec.Code, redactRec.Body.String())
	}
}

func createDisclosureSessionHTTP(t *testing.T, handler http.Handler, actorDid string, requestID string) (string, string) {
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
	sessionRef := ack.EmittedRecordRefs[0]
	openRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.openSession", `{"sessionRef":"`+sessionRef+`","expectedState":"planning","requestId":"req-open-disclosure-http"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if openRec.Code != http.StatusOK {
		t.Fatalf("open session failed: %d %s", openRec.Code, openRec.Body.String())
	}
	startRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.startSession", `{"sessionRef":"`+sessionRef+`","expectedState":"open","requestId":"req-start-disclosure-http"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if startRec.Code != http.StatusOK {
		t.Fatalf("start session failed: %d %s", startRec.Code, startRec.Body.String())
	}
	return sessionRef, ack.EmittedRecordRefs[2]
}