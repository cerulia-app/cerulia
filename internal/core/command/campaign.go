package command

import (
	"context"
	"time"

	"cerulia/internal/core/model"
	"cerulia/internal/core/scope"
	"cerulia/internal/ledger"
	"cerulia/internal/store"
)

func (service *Service) CreateCampaign(ctx context.Context, actorDid string, input CreateCampaignInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.Title, "title"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.Visibility, "visibility"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.RulesetNSID, "rulesetNsid"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.RulesetManifestRef, "rulesetManifestRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyStringSlice(input.StewardDids, "stewardDids"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.DefaultReusePolicyKind, "defaultReusePolicyKind"); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.StewardDids...) {
		return ledger.MutationAck{}, ErrForbidden
	}

	campaignRef := stableRef(actorDid, model.CollectionCampaign, "campaign", input.RequestID)
	return service.executeMutation(ctx, campaignRef, "app.cerulia.rpc.createCampaign", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		seedInput := scope.CreateCampaignInput{
			Title:                  input.Title,
			Visibility:             input.Visibility,
			HouseRef:               input.HouseRef,
			WorldRef:               input.WorldRef,
			RulesetNSID:            input.RulesetNSID,
			RulesetManifestRef:     input.RulesetManifestRef,
			SharedRuleProfileRefs:  input.SharedRuleProfileRefs,
			DefaultReusePolicyKind: input.DefaultReusePolicyKind,
			StewardDids:            input.StewardDids,
			RequestID:              input.RequestID,
		}

		if input.WorldRef != "" {
			_, world, err := decodeStable[model.World](ctx, tx, input.WorldRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			seedInput.WorldDefaultRuleProfileRefs = world.DefaultRuleProfileRefs
		}
		if input.HouseRef != "" {
			_, house, err := decodeStable[model.House](ctx, tx, input.HouseRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			seedInput.HouseWorldRef = house.WorldRef
			seedInput.HouseDefaultRuleProfileRefs = house.DefaultRuleProfileRefs
			seedInput.HouseDefaultReusePolicyKind = house.DefaultReusePolicyKind
		}

		seed, err := scope.CreateCampaign(seedInput)
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}

		record := model.Campaign{
			CampaignID:             store.RecordKey(campaignRef),
			Title:                  seed.Title,
			Visibility:             seed.Visibility,
			HouseRef:               seed.HouseRef,
			WorldRef:               seed.WorldRef,
			RulesetNSID:            seed.RulesetNSID,
			RulesetManifestRef:     seed.RulesetManifestRef,
			SharedRuleProfileRefs:  seed.SharedRuleProfileRefs,
			DefaultReusePolicyKind: seed.DefaultReusePolicyKind,
			StewardDids:            seed.StewardDids,
			CreatedAt:              now,
			Revision:               seed.Revision,
			RequestID:              input.RequestID,
			UpdatedAt:              now,
		}

		stored, err := marshalStable(model.CollectionCampaign, campaignRef, input.RequestID, record.Revision, now, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}

		ack := acceptedAck(input.RequestID, []string{campaignRef})
		ack.CurrentRevision = &record.Revision
		return ack, nil
	})
}

func (service *Service) AttachRuleProfile(ctx context.Context, actorDid string, input AttachRuleProfileInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.CampaignRef, "campaignRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.RuleProfileRef, "ruleProfileRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ExpectedRulesetManifestRef, "expectedRulesetManifestRef"); err != nil {
		return ledger.MutationAck{}, err
	}

	return service.executeMutation(ctx, input.CampaignRef, "app.cerulia.rpc.attachRuleProfile", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		campaignRecord, campaign, err := decodeStable[model.Campaign](ctx, tx, input.CampaignRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !sameActor(actorDid, campaign.StewardDids...) {
			return ledger.MutationAck{}, ErrForbidden
		}
		if campaign.RulesetManifestRef != input.ExpectedRulesetManifestRef {
			return ledger.MutationAck{}, ErrUnsupportedRuleset
		}
		if _, _, err := decodeStable[model.RuleProfile](ctx, tx, input.RuleProfileRef); err != nil {
			return ledger.MutationAck{}, err
		}

		nextRevision, rebase, err := bumpRevision(campaign.Revision, input.ExpectedCampaignRevision, input.RequestID)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if rebase != nil {
			return *rebase, nil
		}

		campaign.SharedRuleProfileRefs = scope.MergeRuleProfileRefs(campaign.SharedRuleProfileRefs, []string{input.RuleProfileRef})
		campaign.Revision = nextRevision
		campaign.RequestID = input.RequestID
		campaign.UpdatedAt = now

		stored, err := marshalStable(model.CollectionCampaign, input.CampaignRef, input.RequestID, campaign.Revision, campaignRecord.CreatedAt, now, campaign)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}

		ack := acceptedAck(input.RequestID, []string{input.CampaignRef})
		ack.CurrentRevision = &campaign.Revision
		return ack, nil
	})
}

func (service *Service) RetireRuleProfile(ctx context.Context, actorDid string, input RetireRuleProfileInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.RuleProfileRef, "ruleProfileRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ScopeKind, "scopeKind"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ScopeRef, "scopeRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ExpectedRulesetManifestRef, "expectedRulesetManifestRef"); err != nil {
		return ledger.MutationAck{}, err
	}

	governingRef := input.ScopeRef
	if governingRef == "" {
		governingRef = input.CampaignRef
	}
	if governingRef == "" {
		governingRef = input.RuleProfileRef
	}

	return service.executeMutation(ctx, governingRef, "app.cerulia.rpc.retireRuleProfile", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		ruleProfileRecord, ruleProfile, err := decodeStable[model.RuleProfile](ctx, tx, input.RuleProfileRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if ruleProfile.ScopeKind != input.ScopeKind || ruleProfile.ScopeRef != input.ScopeRef {
			return rejectedAck(input.RequestID, "rule profile scope mismatch"), nil
		}

		if input.CampaignRef != "" {
			campaignRecord, campaign, err := decodeStable[model.Campaign](ctx, tx, input.CampaignRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if !sameActor(actorDid, campaign.StewardDids...) {
				return ledger.MutationAck{}, ErrForbidden
			}
			if campaign.RulesetManifestRef != input.ExpectedRulesetManifestRef {
				return ledger.MutationAck{}, ErrUnsupportedRuleset
			}
			nextRevision, rebase, err := bumpRevision(campaign.Revision, input.ExpectedCampaignRevision, input.RequestID)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if rebase != nil {
				return *rebase, nil
			}
			campaign.SharedRuleProfileRefs = removeString(campaign.SharedRuleProfileRefs, input.RuleProfileRef)
			campaign.Revision = nextRevision
			campaign.RequestID = input.RequestID
			campaign.UpdatedAt = now
			storedCampaign, err := marshalStable(model.CollectionCampaign, input.CampaignRef, input.RequestID, campaign.Revision, campaignRecord.CreatedAt, now, campaign)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if err := tx.PutStable(ctx, storedCampaign); err != nil {
				return ledger.MutationAck{}, err
			}
		}

		if ruleProfile.Status == "retired" {
			return rejectedAck(input.RequestID, "rule profile already retired"), nil
		}
		ruleProfile.Status = "retired"
		ruleProfile.RequestID = input.RequestID
		ruleProfile.UpdatedAt = now
		storedRuleProfile, err := marshalStable(model.CollectionRuleProfile, input.RuleProfileRef, input.RequestID, ruleProfileRecord.Revision, ruleProfileRecord.CreatedAt, now, ruleProfile)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, storedRuleProfile); err != nil {
			return ledger.MutationAck{}, err
		}

		return acceptedAck(input.RequestID, []string{input.RuleProfileRef}), nil
	})
}

func removeString(values []string, target string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value == target {
			continue
		}
		result = append(result, value)
	}
	return result
}
