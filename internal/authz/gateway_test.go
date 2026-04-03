package authz

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestAuthorizeRequest(t *testing.T) {
	gateway := NewGateway(Config{AllowInsecureDirect: true})
	tests := []struct {
		name           string
		operationNSID  string
		allowAnonymous bool
		actorDid       string
		bundles        string
		wantErr        error
		wantAnonymous  bool
	}{
		{name: "anonymous public query", operationNSID: "app.cerulia.rpc.getCampaignView", allowAnonymous: true, wantAnonymous: true},
		{name: "anonymous session preflight", operationNSID: "app.cerulia.rpc.getSessionAccessPreflight", allowAnonymous: true, wantAnonymous: true},
		{name: "authenticated session preflight without bundle", operationNSID: "app.cerulia.rpc.getSessionAccessPreflight", actorDid: "did:plc:alice"},
		{name: "authenticated public query without bundle passes", operationNSID: "app.cerulia.rpc.getCampaignView", allowAnonymous: true, actorDid: "did:plc:alice"},
		{name: "missing actor rejects private query", operationNSID: "app.cerulia.rpc.getCharacterHome", wantErr: ErrUnauthorized},
		{name: "wrong bundle rejects", operationNSID: "app.cerulia.rpc.createCampaign", actorDid: "did:plc:alice", bundles: CoreReader, wantErr: ErrForbidden},
		{name: "governance operator passes", operationNSID: "app.cerulia.rpc.createSessionDraft", actorDid: "did:plc:alice", bundles: GovernanceOperator},
		{name: "participant passes", operationNSID: "app.cerulia.rpc.getSessionView", actorDid: "did:plc:alice", bundles: SessionParticipant},
		{name: "appeal originator passes", operationNSID: "app.cerulia.rpc.submitAppeal", actorDid: "did:plc:alice", bundles: AppealOriginator},
		{name: "appeal resolver passes", operationNSID: "app.cerulia.rpc.submitAppeal", actorDid: "did:plc:alice", bundles: AppealResolver},
		{name: "review appeal resolver passes", operationNSID: "app.cerulia.rpc.reviewAppeal", actorDid: "did:plc:alice", bundles: AppealResolver},
		{name: "review appeal wrong bundle rejects", operationNSID: "app.cerulia.rpc.reviewAppeal", actorDid: "did:plc:alice", bundles: AppealOriginator, wantErr: ErrForbidden},
		{name: "escalate appeal resolver passes", operationNSID: "app.cerulia.rpc.escalateAppeal", actorDid: "did:plc:alice", bundles: AppealResolver},
		{name: "escalate appeal wrong bundle rejects", operationNSID: "app.cerulia.rpc.escalateAppeal", actorDid: "did:plc:alice", bundles: AppealOriginator, wantErr: ErrForbidden},
		{name: "resolve appeal resolver passes", operationNSID: "app.cerulia.rpc.resolveAppeal", actorDid: "did:plc:alice", bundles: AppealResolver},
		{name: "resolve appeal wrong bundle rejects", operationNSID: "app.cerulia.rpc.resolveAppeal", actorDid: "did:plc:alice", bundles: AppealOriginator, wantErr: ErrForbidden},
		{name: "publication operator passes", operationNSID: "app.cerulia.rpc.publishSessionLink", actorDid: "did:plc:alice", bundles: PublicationOperator},
		{name: "exact bundle passes", operationNSID: "app.cerulia.rpc.createCampaign", actorDid: "did:plc:alice", bundles: CoreWriter},
	}

	for _, test := range tests {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		if test.actorDid != "" {
			req.Header.Set(HeaderActorDID, test.actorDid)
		}
		if test.bundles != "" {
			req.Header.Set(HeaderPermissionSets, test.bundles)
		}

		subject, err := gateway.AuthorizeRequest(req, test.operationNSID, test.allowAnonymous)
		if err != test.wantErr {
			t.Fatalf("%s: expected err %v, got %v", test.name, test.wantErr, err)
		}
		if subject.Anonymous != test.wantAnonymous {
			t.Fatalf("%s: expected anonymous=%v, got %v", test.name, test.wantAnonymous, subject.Anonymous)
		}
	}
}

func TestAuthorizeRequestRequiresVerifiedHeadersWhenConfigured(t *testing.T) {
	gateway := NewGateway(Config{TrustedProxyHMACSecret: "test-secret"})
	req := httptest.NewRequest(http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", strings.NewReader(`{"requestId":"req-1"}`))
	req.Header.Set(HeaderActorDID, "did:plc:alice")
	req.Header.Set(HeaderPermissionSets, CoreWriter)

	if _, err := gateway.AuthorizeRequest(req, "app.cerulia.rpc.createCampaign", false); err != ErrUnauthorized {
		t.Fatalf("expected unauthorized without signature, got %v", err)
	}

	signRequest(t, req, "test-secret", "app.cerulia.rpc.createCampaign", time.Now().UTC(), "nonce-1")

	if _, err := gateway.AuthorizeRequest(req, "app.cerulia.rpc.createCampaign", false); err != nil {
		t.Fatalf("expected signed request to pass, got %v", err)
	}
}

func TestAuthorizeRequestRejectsReplayedNonce(t *testing.T) {
	gateway := NewGateway(Config{TrustedProxyHMACSecret: "test-secret"})
	req := httptest.NewRequest(http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", strings.NewReader(`{"requestId":"req-1"}`))
	req.Header.Set(HeaderActorDID, "did:plc:alice")
	req.Header.Set(HeaderPermissionSets, CoreWriter)
	signRequest(t, req, "test-secret", "app.cerulia.rpc.createCampaign", time.Now().UTC(), "nonce-replay")

	if _, err := gateway.AuthorizeRequest(req, "app.cerulia.rpc.createCampaign", false); err != nil {
		t.Fatalf("expected first request to pass, got %v", err)
	}
	req.Body = io.NopCloser(strings.NewReader(`{"requestId":"req-1"}`))
	if _, err := gateway.AuthorizeRequest(req, "app.cerulia.rpc.createCampaign", false); err != ErrUnauthorized {
		t.Fatalf("expected replayed nonce to be unauthorized, got %v", err)
	}
}

func TestAuthorizeRequestRejectsMismatchedOperation(t *testing.T) {
	gateway := NewGateway(Config{TrustedProxyHMACSecret: "test-secret"})
	req := httptest.NewRequest(http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", strings.NewReader(`{"requestId":"req-1"}`))
	req.Header.Set(HeaderActorDID, "did:plc:alice")
	req.Header.Set(HeaderPermissionSets, GovernanceOperator)
	signRequest(t, req, "test-secret", "app.cerulia.rpc.createCampaign", time.Now().UTC(), "nonce-op")

	if _, err := gateway.AuthorizeRequest(req, "app.cerulia.rpc.createSessionDraft", false); err != ErrUnauthorized {
		t.Fatalf("expected mismatched operation to be unauthorized, got %v", err)
	}
}

func TestAuthorizeRequestRejectsExpiredTimestamp(t *testing.T) {
	gateway := NewGateway(Config{TrustedProxyHMACSecret: "test-secret", TrustedProxyMaxSkew: time.Minute})
	req := httptest.NewRequest(http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", strings.NewReader(`{"requestId":"req-1"}`))
	req.Header.Set(HeaderActorDID, "did:plc:alice")
	req.Header.Set(HeaderPermissionSets, CoreWriter)
	signRequest(t, req, "test-secret", "app.cerulia.rpc.createCampaign", time.Now().UTC().Add(-2*time.Minute), "nonce-expired")

	if _, err := gateway.AuthorizeRequest(req, "app.cerulia.rpc.createCampaign", false); err != ErrUnauthorized {
		t.Fatalf("expected expired timestamp to be unauthorized, got %v", err)
	}
}

func TestAuthorizeRequestRejectsBodyTampering(t *testing.T) {
	gateway := NewGateway(Config{TrustedProxyHMACSecret: "test-secret"})
	req := httptest.NewRequest(http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", strings.NewReader(`{"requestId":"req-1"}`))
	req.Header.Set(HeaderActorDID, "did:plc:alice")
	req.Header.Set(HeaderPermissionSets, CoreWriter)
	signRequest(t, req, "test-secret", "app.cerulia.rpc.createCampaign", time.Now().UTC(), "nonce-body")
	req.Body = io.NopCloser(strings.NewReader(`{"requestId":"req-2"}`))

	if _, err := gateway.AuthorizeRequest(req, "app.cerulia.rpc.createCampaign", false); err != ErrUnauthorized {
		t.Fatalf("expected body tampering to be unauthorized, got %v", err)
	}
}

func signRequest(t *testing.T, req *http.Request, secret string, operationNSID string, timestamp time.Time, nonce string) {
	t.Helper()
	stamp := strconvFormatInt(timestamp.Unix())
	req.Header.Set(HeaderAuthTimestamp, stamp)
	req.Header.Set(HeaderAuthNonce, nonce)
	subject := Subject{
		ActorDID:       strings.TrimSpace(req.Header.Get(HeaderActorDID)),
		PermissionSets: parsePermissionSets(req.Header.Get(HeaderPermissionSets)),
	}
	canonical, err := canonicalSignaturePayload(req, subject, operationNSID, stamp, nonce)
	if err != nil {
		t.Fatalf("canonical signature payload: %v", err)
	}
	mac := hmac.New(sha256.New, []byte(secret))
	if _, err := mac.Write([]byte(canonical)); err != nil {
		t.Fatalf("sign request: %v", err)
	}
	req.Header.Set(HeaderAuthSignature, hex.EncodeToString(mac.Sum(nil)))
}

func strconvFormatInt(value int64) string {
	return strconv.FormatInt(value, 10)
}
