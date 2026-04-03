package authz

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAuthorizeRequest(t *testing.T) {
	gateway := NewGateway()
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
		{name: "missing actor rejects private query", operationNSID: "app.cerulia.rpc.getCharacterHome", wantErr: ErrUnauthorized},
		{name: "wrong bundle rejects", operationNSID: "app.cerulia.rpc.createCampaign", actorDid: "did:plc:alice", bundles: CoreReader, wantErr: ErrForbidden},
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