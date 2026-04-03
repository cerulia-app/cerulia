package sharing

import (
	"errors"
	"testing"
	"time"
)

func TestValidateReuseGrantTargetKindInvariants(t *testing.T) {
	tests := []struct {
		name  string
		grant ReuseGrant
		want  error
	}{
		{name: "campaign target requires ref", grant: ReuseGrant{CharacterBranchRef: "at://branch/1", SourceCampaignRef: "at://campaign/source", GrantedByDid: "did:plc:grantor1", GrantedAt: fixtureTime(), RequestID: "req-1", TargetKind: "campaign", TargetRef: "at://campaign/1", ReuseMode: "fork-and-advance"}},
		{name: "actor target requires did", grant: ReuseGrant{CharacterBranchRef: "at://branch/1", SourceCampaignRef: "at://campaign/source", GrantedByDid: "did:plc:grantor1", GrantedAt: fixtureTime(), RequestID: "req-1", TargetKind: "actor", TargetDid: "did:plc:actor1", ReuseMode: "fork-only"}},
		{name: "public target only allows summary share", grant: ReuseGrant{CharacterBranchRef: "at://branch/1", SourceCampaignRef: "at://campaign/source", GrantedByDid: "did:plc:grantor1", GrantedAt: fixtureTime(), RequestID: "req-1", TargetKind: "public", ReuseMode: "summary-share"}},
		{name: "campaign target rejects did", grant: ReuseGrant{CharacterBranchRef: "at://branch/1", SourceCampaignRef: "at://campaign/source", GrantedByDid: "did:plc:grantor1", GrantedAt: fixtureTime(), RequestID: "req-1", TargetKind: "campaign", TargetRef: "at://campaign/1", TargetDid: "did:plc:actor1", ReuseMode: "fork-only"}, want: ErrInvalidReuseGrant},
		{name: "actor target rejects ref", grant: ReuseGrant{CharacterBranchRef: "at://branch/1", SourceCampaignRef: "at://campaign/source", GrantedByDid: "did:plc:grantor1", GrantedAt: fixtureTime(), RequestID: "req-1", TargetKind: "actor", TargetRef: "at://campaign/1", TargetDid: "did:plc:actor1", ReuseMode: "fork-only"}, want: ErrInvalidReuseGrant},
		{name: "public target rejects stray fields", grant: ReuseGrant{CharacterBranchRef: "at://branch/1", SourceCampaignRef: "at://campaign/source", GrantedByDid: "did:plc:grantor1", GrantedAt: fixtureTime(), RequestID: "req-1", TargetKind: "public", TargetRef: "at://campaign/1", ReuseMode: "summary-share"}, want: ErrInvalidReuseGrant},
		{name: "public target rejects full share", grant: ReuseGrant{CharacterBranchRef: "at://branch/1", SourceCampaignRef: "at://campaign/source", GrantedByDid: "did:plc:grantor1", GrantedAt: fixtureTime(), RequestID: "req-1", TargetKind: "public", ReuseMode: "full-share"}, want: ErrInvalidReuseGrant},
	}

	for _, test := range tests {
		err := ValidateReuseGrant(test.grant)
		if !errors.Is(err, test.want) {
			t.Fatalf("%s: expected %v, got %v", test.name, test.want, err)
		}
	}
}

func fixtureTime() time.Time {
	return time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC)
}
