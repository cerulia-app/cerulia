package scope

import "errors"

var ErrInvalidCampaignSeed = errors.New("invalid campaign seed")

type CreateCampaignInput struct {
	Title                       string
	Visibility                  string
	HouseRef                    string
	WorldRef                    string
	HouseWorldRef               string
	RulesetNSID                 string
	RulesetManifestRef          string
	WorldDefaultRuleProfileRefs []string
	HouseDefaultRuleProfileRefs []string
	SharedRuleProfileRefs       []string
	DefaultReusePolicyKind      string
	HouseDefaultReusePolicyKind string
	StewardDids                 []string
	RequestID                   string
}

type Campaign struct {
	Title                  string
	Visibility             string
	HouseRef               string
	WorldRef               string
	RulesetNSID            string
	RulesetManifestRef     string
	SharedRuleProfileRefs  []string
	DefaultReusePolicyKind string
	StewardDids            []string
	Revision               int64
	RequestID              string
}

func CreateCampaign(input CreateCampaignInput) (Campaign, error) {
	if input.Title == "" || input.Visibility == "" || input.RulesetNSID == "" || input.RulesetManifestRef == "" || input.RequestID == "" || len(input.StewardDids) == 0 {
		return Campaign{}, ErrInvalidCampaignSeed
	}
	if input.HouseRef != "" && input.WorldRef != "" {
		if input.HouseWorldRef == "" || input.HouseWorldRef != input.WorldRef {
			return Campaign{}, ErrInvalidCampaignSeed
		}
	}

	defaultReusePolicyKind := input.DefaultReusePolicyKind
	if defaultReusePolicyKind == "" {
		defaultReusePolicyKind = input.HouseDefaultReusePolicyKind
	}
	if defaultReusePolicyKind == "" {
		return Campaign{}, ErrInvalidCampaignSeed
	}

	return Campaign{
		Title:                  input.Title,
		Visibility:             input.Visibility,
		HouseRef:               input.HouseRef,
		WorldRef:               input.WorldRef,
		RulesetNSID:            input.RulesetNSID,
		RulesetManifestRef:     input.RulesetManifestRef,
		SharedRuleProfileRefs:  MergeRuleProfileRefs(input.WorldDefaultRuleProfileRefs, input.HouseDefaultRuleProfileRefs, input.SharedRuleProfileRefs),
		DefaultReusePolicyKind: defaultReusePolicyKind,
		StewardDids:            append([]string(nil), input.StewardDids...),
		Revision:               1,
		RequestID:              input.RequestID,
	}, nil
}

func MergeRuleProfileRefs(groups ...[]string) []string {
	seen := map[string]struct{}{}
	merged := []string{}
	for _, group := range groups {
		for _, ref := range group {
			if ref == "" {
				continue
			}
			if _, exists := seen[ref]; exists {
				continue
			}
			seen[ref] = struct{}{}
			merged = append(merged, ref)
		}
	}

	return merged
}
