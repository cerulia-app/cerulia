package scope

import "testing"

func TestCreateCampaignMergesSeedProfilesInOrder(t *testing.T) {
	input := CreateCampaignInput{
		Title:                       "星見ヶ原",
		Visibility:                  "unlisted",
		RulesetNSID:                 "app.cerulia.rules.swords-world",
		RulesetManifestRef:          "at://rules/manifest",
		DefaultReusePolicyKind:      "explicit-cross-campaign",
		WorldDefaultRuleProfileRefs: []string{"world-a", "world-b", "shared"},
		HouseDefaultRuleProfileRefs: []string{"shared", "house-a"},
		SharedRuleProfileRefs:       []string{"house-a", "campaign-a", "campaign-b"},
		StewardDids:                 []string{"did:plc:steward1"},
		RequestID:                   "req-1",
	}

	campaign, err := CreateCampaign(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := []string{"world-a", "world-b", "shared", "house-a", "campaign-a", "campaign-b"}
	assertStringSliceEqual(t, want, campaign.SharedRuleProfileRefs)
}

func TestCreateCampaignDoesNotFollowSourceSeedChanges(t *testing.T) {
	worldDefaults := []string{"world-a"}
	houseDefaults := []string{"house-a"}
	campaignDefaults := []string{"campaign-a"}

	campaign, err := CreateCampaign(CreateCampaignInput{
		Title:                       "星見ヶ原",
		Visibility:                  "unlisted",
		RulesetNSID:                 "app.cerulia.rules.swords-world",
		RulesetManifestRef:          "at://rules/manifest",
		WorldDefaultRuleProfileRefs: worldDefaults,
		HouseDefaultRuleProfileRefs: houseDefaults,
		SharedRuleProfileRefs:       campaignDefaults,
		HouseDefaultReusePolicyKind: "explicit-cross-campaign",
		StewardDids:                 []string{"did:plc:steward1"},
		RequestID:                   "req-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	worldDefaults[0] = "mutated-world"
	houseDefaults[0] = "mutated-house"
	campaignDefaults[0] = "mutated-campaign"

	assertStringSliceEqual(t, []string{"world-a", "house-a", "campaign-a"}, campaign.SharedRuleProfileRefs)
	if campaign.DefaultReusePolicyKind != "explicit-cross-campaign" {
		t.Fatalf("unexpected default reuse policy: %s", campaign.DefaultReusePolicyKind)
	}
}

func assertStringSliceEqual(t *testing.T, want []string, got []string) {
	t.Helper()
	if len(want) != len(got) {
		t.Fatalf("unexpected slice length: want=%d got=%d", len(want), len(got))
	}
	for index := range want {
		if want[index] != got[index] {
			t.Fatalf("unexpected value at %d: want=%s got=%s", index, want[index], got[index])
		}
	}
}
