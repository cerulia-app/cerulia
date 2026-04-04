package command

import (
	"context"
	"errors"
	"time"

	"cerulia/internal/core/character"
	"cerulia/internal/core/model"
	"cerulia/internal/ledger"
	"cerulia/internal/store"
)

func (service *Service) ImportCharacterSheet(ctx context.Context, actorDid string, input ImportCharacterSheetInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.OwnerDid, "ownerDid"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.RulesetNSID, "rulesetNsid"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.DisplayName, "displayName"); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.OwnerDid) {
		return ledger.MutationAck{}, ErrForbidden
	}

	sheetRef := stableRef(input.OwnerDid, model.CollectionCharacterSheet, "sheet", input.RequestID)
	return service.executeMutation(ctx, sheetRef, "app.cerulia.rpc.importCharacterSheet", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		record := model.CharacterSheet{
			OwnerDid:         input.OwnerDid,
			RulesetNSID:      input.RulesetNSID,
			DisplayName:      input.DisplayName,
			PortraitRef:      input.PortraitRef,
			PublicProfile:    append([]byte(nil), input.PublicProfile...),
			Stats:            append([]byte(nil), input.Stats...),
			ExternalSheetURI: input.ExternalSheetURI,
			Version:          1,
			UpdatedAt:        now,
		}
		stored, err := marshalStable(model.CollectionCharacterSheet, sheetRef, input.RequestID, record.Version, now, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{sheetRef}), nil
	})
}

func (service *Service) CreateCharacterBranch(ctx context.Context, actorDid string, input CreateCharacterBranchInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.OwnerDid, "ownerDid"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.BaseSheetRef, "baseSheetRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.BranchKind, "branchKind"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.BranchLabel, "branchLabel"); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.OwnerDid) {
		return ledger.MutationAck{}, ErrForbidden
	}

	branchRef := stableRef(input.OwnerDid, model.CollectionCharacterBranch, "branch", input.RequestID)
	return service.executeMutation(ctx, branchRef, "app.cerulia.rpc.createCharacterBranch", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if _, _, err := decodeStable[model.CharacterSheet](ctx, tx, input.BaseSheetRef); err != nil {
			return ledger.MutationAck{}, err
		}
		record := model.CharacterBranch{
			OwnerDid:           input.OwnerDid,
			BaseSheetRef:       input.BaseSheetRef,
			BranchKind:         input.BranchKind,
			BranchLabel:        input.BranchLabel,
			OverridePayloadRef: input.OverridePayloadRef,
			ImportedFrom:       input.ImportedFrom,
			SourceRevision:     input.SourceRevision,
			SyncMode:           input.SyncMode,
			RequestID:          input.RequestID,
			Revision:           1,
			CreatedAt:          now,
			UpdatedAt:          now,
			UpdatedByDid:       actorDid,
		}
		stored, err := marshalStable(model.CollectionCharacterBranch, branchRef, input.RequestID, record.Revision, now, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{branchRef})
		ack.CurrentRevision = &record.Revision
		return ack, nil
	})
}

func (service *Service) UpdateCharacterBranch(ctx context.Context, actorDid string, input UpdateCharacterBranchInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.CharacterBranchRef, "characterBranchRef"); err != nil {
		return ledger.MutationAck{}, err
	}

	return service.executeMutation(ctx, input.CharacterBranchRef, "app.cerulia.rpc.updateCharacterBranch", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		branchRecord, branchModel, err := decodeStable[model.CharacterBranch](ctx, tx, input.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !sameActor(actorDid, branchModel.OwnerDid) {
			return ledger.MutationAck{}, ErrForbidden
		}

		branchDomain := modelBranchToDomain(branchModel)
		updatedDomain, err := branchDomain.Update(character.UpdateBranchInput{
			ExpectedRevision:   input.ExpectedRevision,
			BranchLabel:        optionalString(input.BranchLabel),
			OverridePayloadRef: optionalString(input.OverridePayloadRef),
			ImportedFrom:       optionalString(input.ImportedFrom),
			SourceRevision:     optionalInt64(input.SourceRevision),
			SyncMode:           optionalString(input.SyncMode),
			UpdatedAt:          now,
			UpdatedByDid:       actorDid,
		})
		if err != nil {
			if errors.Is(err, ledger.ErrRebaseNeeded) {
				ack := rebaseAck(input.RequestID, branchModel.Revision)
				return ack, nil
			}
			return rejectedAck(input.RequestID, err.Error()), nil
		}

		updatedModel := domainBranchToModel(updatedDomain, branchModel.CreatedAt, branchModel.RequestID)
		updatedModel.RequestID = input.RequestID
		stored, err := marshalStable(model.CollectionCharacterBranch, input.CharacterBranchRef, input.RequestID, updatedModel.Revision, branchRecord.CreatedAt, now, updatedModel)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{input.CharacterBranchRef})
		ack.CurrentRevision = &updatedModel.Revision
		return ack, nil
	})
}

func (service *Service) RetireCharacterBranch(ctx context.Context, actorDid string, input RetireCharacterBranchInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.CharacterBranchRef, "characterBranchRef"); err != nil {
		return ledger.MutationAck{}, err
	}

	return service.executeMutation(ctx, input.CharacterBranchRef, "app.cerulia.rpc.retireCharacterBranch", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		branchRecord, branchModel, err := decodeStable[model.CharacterBranch](ctx, tx, input.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !sameActor(actorDid, branchModel.OwnerDid) {
			return ledger.MutationAck{}, ErrForbidden
		}

		branchDomain := modelBranchToDomain(branchModel)
		updatedDomain, err := branchDomain.Retire(input.ExpectedRevision, now, actorDid)
		if err != nil {
			if errors.Is(err, ledger.ErrRebaseNeeded) {
				ack := rebaseAck(input.RequestID, branchModel.Revision)
				return ack, nil
			}
			return rejectedAck(input.RequestID, err.Error()), nil
		}

		updatedModel := domainBranchToModel(updatedDomain, branchModel.CreatedAt, branchModel.RequestID)
		updatedModel.RequestID = input.RequestID
		stored, err := marshalStable(model.CollectionCharacterBranch, input.CharacterBranchRef, input.RequestID, updatedModel.Revision, branchRecord.CreatedAt, now, updatedModel)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{input.CharacterBranchRef})
		ack.CurrentRevision = &updatedModel.Revision
		return ack, nil
	})
}

func (service *Service) RecordCharacterAdvancement(ctx context.Context, actorDid string, input RecordCharacterAdvancementInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.CharacterBranchRef, "characterBranchRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.AdvancementKind, "advancementKind"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.DeltaPayloadRef, "deltaPayloadRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ApprovedByDid, "approvedByDid"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireTimeField(input.EffectiveAt, "effectiveAt"); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.ApprovedByDid) {
		return ledger.MutationAck{}, ErrForbidden
	}

	return service.executeMutation(ctx, input.CharacterBranchRef, "app.cerulia.rpc.recordCharacterAdvancement", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		_, branchModel, err := decodeStable[model.CharacterBranch](ctx, tx, input.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if branchModel.RetiredAt != nil {
			return rejectedAck(input.RequestID, "branch is retired"), nil
		}
		if input.SupersedesRef != "" {
			_, advancement, err := decodeAppend[model.CharacterAdvancement](ctx, tx, input.SupersedesRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if advancement.CharacterBranchRef != input.CharacterBranchRef {
				return rejectedAck(input.RequestID, "supersedes advancement branch mismatch"), nil
			}
		}

		repoDID, err := refRepoDID(input.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		advancementRef := appendRef(repoDID, model.CollectionCharacterAdvancement, "advancement", input.RequestID)
		record := model.CharacterAdvancement{
			CharacterBranchRef: input.CharacterBranchRef,
			AdvancementKind:    input.AdvancementKind,
			DeltaPayloadRef:    input.DeltaPayloadRef,
			ApprovedByDid:      input.ApprovedByDid,
			EffectiveAt:        input.EffectiveAt.UTC(),
			SupersedesRef:      input.SupersedesRef,
			RequestID:          input.RequestID,
			CreatedAt:          now,
			Note:               input.Note,
		}
		stored, err := marshalAppend(model.CollectionCharacterAdvancement, advancementRef, input.CharacterBranchRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{advancementRef}), nil
	})
}

func (service *Service) RecordCharacterEpisode(ctx context.Context, actorDid string, input RecordCharacterEpisodeInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.CharacterBranchRef, "characterBranchRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.RulesetManifestRef, "rulesetManifestRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requirePresentSlice(input.EffectiveRuleProfileRefs, "effectiveRuleProfileRefs"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.OutcomeSummary, "outcomeSummary"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requirePresentSlice(input.AdvancementRefs, "advancementRefs"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.RecordedByDid, "recordedByDid"); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.RecordedByDid) {
		return ledger.MutationAck{}, ErrForbidden
	}

	return service.executeMutation(ctx, input.CharacterBranchRef, "app.cerulia.rpc.recordCharacterEpisode", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		_, branchModel, err := decodeStable[model.CharacterBranch](ctx, tx, input.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if branchModel.RetiredAt != nil {
			return rejectedAck(input.RequestID, "branch is retired"), nil
		}

		if input.CampaignRef != "" {
			_, campaignModel, err := decodeStable[model.Campaign](ctx, tx, input.CampaignRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if !sameActor(actorDid, branchModel.OwnerDid) && !sameActor(actorDid, campaignModel.StewardDids...) {
				return ledger.MutationAck{}, ErrForbidden
			}
			if campaignModel.RulesetManifestRef != input.RulesetManifestRef {
				return ledger.MutationAck{}, ErrUnsupportedRuleset
			}
		}

		advancementRefs := make([]character.EpisodeAdvancementRef, 0, len(input.AdvancementRefs))
		for _, ref := range input.AdvancementRefs {
			_, advancement, err := decodeAppend[model.CharacterAdvancement](ctx, tx, ref)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			advancementRefs = append(advancementRefs, character.EpisodeAdvancementRef{Ref: ref, CharacterBranchRef: advancement.CharacterBranchRef})
		}
		if err := character.ValidateEpisodeAdvancementRefs(input.CharacterBranchRef, advancementRefs); err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}

		repoDID, err := refRepoDID(input.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		episodeRef := appendRef(repoDID, model.CollectionCharacterEpisode, "episode", input.RequestID)
		record := model.CharacterEpisode{
			CharacterBranchRef:       input.CharacterBranchRef,
			CampaignRef:              input.CampaignRef,
			ScenarioLabel:            input.ScenarioLabel,
			RulesetManifestRef:       input.RulesetManifestRef,
			EffectiveRuleProfileRefs: append([]string(nil), input.EffectiveRuleProfileRefs...),
			OutcomeSummary:           input.OutcomeSummary,
			AdvancementRefs:          append([]string(nil), input.AdvancementRefs...),
			SupersedesRef:            input.SupersedesRef,
			RecordedByDid:            input.RecordedByDid,
			CreatedAt:                now,
			RequestID:                input.RequestID,
		}
		stored, err := marshalAppend(model.CollectionCharacterEpisode, episodeRef, input.CharacterBranchRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{episodeRef}), nil
	})
}

func (service *Service) RecordCharacterConversion(ctx context.Context, actorDid string, input RecordCharacterConversionInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.SourceSheetRef, "sourceSheetRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requirePositiveInt64Field(input.SourceSheetVersion, "sourceSheetVersion"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.SourceRulesetManifestRef, "sourceRulesetManifestRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requirePresentSlice(input.SourceEffectiveRuleProfileRefs, "sourceEffectiveRuleProfileRefs"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.TargetSheetRef, "targetSheetRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requirePositiveInt64Field(input.TargetSheetVersion, "targetSheetVersion"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.TargetBranchRef, "targetBranchRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.TargetRulesetManifestRef, "targetRulesetManifestRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requirePresentSlice(input.TargetEffectiveRuleProfileRefs, "targetEffectiveRuleProfileRefs"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ConversionContractRef, "conversionContractRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requirePositiveInt64Field(input.ConversionContractVersion, "conversionContractVersion"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ConvertedByDid, "convertedByDid"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireTimeField(input.ConvertedAt, "convertedAt"); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.ConvertedByDid) {
		return ledger.MutationAck{}, ErrForbidden
	}

	return service.executeMutation(ctx, input.TargetBranchRef, "app.cerulia.rpc.recordCharacterConversion", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		_, sourceSheet, err := decodeStable[model.CharacterSheet](ctx, tx, input.SourceSheetRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if sourceSheet.Version != input.SourceSheetVersion {
			return rejectedAck(input.RequestID, "source sheet version mismatch"), nil
		}
		_, sourceManifest, err := decodeStable[model.RulesetManifest](ctx, tx, input.SourceRulesetManifestRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if sourceManifest.RulesetNSID != sourceSheet.RulesetNSID {
			return rejectedAck(input.RequestID, "source ruleset manifest mismatch"), nil
		}

		_, targetSheet, err := decodeStable[model.CharacterSheet](ctx, tx, input.TargetSheetRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if targetSheet.Version != input.TargetSheetVersion {
			return rejectedAck(input.RequestID, "target sheet version mismatch"), nil
		}
		_, targetManifest, err := decodeStable[model.RulesetManifest](ctx, tx, input.TargetRulesetManifestRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if targetManifest.RulesetNSID != targetSheet.RulesetNSID {
			return rejectedAck(input.RequestID, "target ruleset manifest mismatch"), nil
		}

		_, targetBranch, err := decodeStable[model.CharacterBranch](ctx, tx, input.TargetBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if targetBranch.BaseSheetRef != input.TargetSheetRef {
			return rejectedAck(input.RequestID, "target branch base sheet mismatch"), nil
		}
		var targetCampaign model.Campaign
		if input.TargetCampaignRef != "" {
			_, campaignModel, err := decodeStable[model.Campaign](ctx, tx, input.TargetCampaignRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			targetCampaign = campaignModel
			if campaignModel.RulesetManifestRef != input.TargetRulesetManifestRef {
				return ledger.MutationAck{}, ErrUnsupportedRuleset
			}
		}
		if !sameActor(actorDid, targetBranch.OwnerDid) {
			if input.TargetCampaignRef == "" {
				return ledger.MutationAck{}, ErrForbidden
			}
			if !sameActor(actorDid, targetCampaign.StewardDids...) {
				return ledger.MutationAck{}, ErrForbidden
			}
		}
		if input.SourceBranchRef != "" {
			_, sourceBranch, err := decodeStable[model.CharacterBranch](ctx, tx, input.SourceBranchRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if sourceBranch.BaseSheetRef != input.SourceSheetRef {
				return rejectedAck(input.RequestID, "source branch base sheet mismatch"), nil
			}
		}
		if input.ReuseGrantRef != "" {
			_, reuseGrant, err := decodeAppend[model.ReuseGrant](ctx, tx, input.ReuseGrantRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if reuseGrant.RevokedAt != nil {
				return rejectedAck(input.RequestID, "reuse grant is revoked"), nil
			}
			if input.SourceBranchRef == "" {
				return ledger.MutationAck{}, invalidInputf("sourceBranchRef is required when reuseGrantRef is set")
			}
			if reuseGrant.CharacterBranchRef != input.SourceBranchRef {
				return rejectedAck(input.RequestID, "reuse grant source branch mismatch"), nil
			}
			switch reuseGrant.TargetKind {
			case "campaign":
				if input.TargetCampaignRef == "" || reuseGrant.TargetRef != input.TargetCampaignRef {
					return rejectedAck(input.RequestID, "reuse grant target mismatch"), nil
				}
			case "house":
				if input.TargetCampaignRef == "" || targetCampaign.HouseRef == "" || reuseGrant.TargetRef != targetCampaign.HouseRef {
					return rejectedAck(input.RequestID, "reuse grant target mismatch"), nil
				}
			case "world":
				targetWorldRef := targetCampaign.WorldRef
				if targetWorldRef == "" && targetCampaign.HouseRef != "" {
					_, targetHouse, err := decodeStable[model.House](ctx, tx, targetCampaign.HouseRef)
					if err != nil {
						return ledger.MutationAck{}, err
					}
					targetWorldRef = targetHouse.WorldRef
				}
				if input.TargetCampaignRef == "" || targetWorldRef == "" || reuseGrant.TargetRef != targetWorldRef {
					return rejectedAck(input.RequestID, "reuse grant target mismatch"), nil
				}
			case "actor":
				if reuseGrant.TargetDid == "" || reuseGrant.TargetDid != targetBranch.OwnerDid {
					return rejectedAck(input.RequestID, "reuse grant target mismatch"), nil
				}
			case "public":
				return rejectedAck(input.RequestID, "public reuse grant does not authorize character conversion"), nil
			}
		}

		repoDID, err := refRepoDID(input.TargetBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		conversionRef := appendRef(repoDID, model.CollectionCharacterConversion, "conversion", input.RequestID)
		record := model.CharacterConversion{
			SourceSheetRef:                 input.SourceSheetRef,
			SourceSheetVersion:             input.SourceSheetVersion,
			SourceBranchRef:                input.SourceBranchRef,
			SourceEpisodeRefs:              append([]string(nil), input.SourceEpisodeRefs...),
			SourceRulesetManifestRef:       input.SourceRulesetManifestRef,
			SourceEffectiveRuleProfileRefs: append([]string(nil), input.SourceEffectiveRuleProfileRefs...),
			TargetSheetRef:                 input.TargetSheetRef,
			TargetSheetVersion:             input.TargetSheetVersion,
			TargetBranchRef:                input.TargetBranchRef,
			TargetCampaignRef:              input.TargetCampaignRef,
			TargetRulesetManifestRef:       input.TargetRulesetManifestRef,
			TargetEffectiveRuleProfileRefs: append([]string(nil), input.TargetEffectiveRuleProfileRefs...),
			ConversionContractRef:          input.ConversionContractRef,
			ConversionContractVersion:      input.ConversionContractVersion,
			ReuseGrantRef:                  input.ReuseGrantRef,
			SupersedesRef:                  input.SupersedesRef,
			ConvertedByDid:                 input.ConvertedByDid,
			ConvertedAt:                    input.ConvertedAt.UTC(),
			RequestID:                      input.RequestID,
			Note:                           input.Note,
		}
		stored, err := marshalAppend(model.CollectionCharacterConversion, conversionRef, input.TargetBranchRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{conversionRef}), nil
	})
}

func modelBranchToDomain(record model.CharacterBranch) character.Branch {
	return character.Branch{
		OwnerDid:           record.OwnerDid,
		BaseSheetRef:       record.BaseSheetRef,
		BranchKind:         record.BranchKind,
		BranchLabel:        record.BranchLabel,
		OverridePayloadRef: record.OverridePayloadRef,
		ImportedFrom:       record.ImportedFrom,
		SourceRevision:     record.SourceRevision,
		SyncMode:           record.SyncMode,
		Revision:           record.Revision,
		UpdatedAt:          record.UpdatedAt,
		UpdatedByDid:       record.UpdatedByDid,
		RetiredAt:          record.RetiredAt,
	}
}

func domainBranchToModel(branch character.Branch, createdAt time.Time, requestID string) model.CharacterBranch {
	return model.CharacterBranch{
		OwnerDid:           branch.OwnerDid,
		BaseSheetRef:       branch.BaseSheetRef,
		BranchKind:         branch.BranchKind,
		BranchLabel:        branch.BranchLabel,
		OverridePayloadRef: branch.OverridePayloadRef,
		ImportedFrom:       branch.ImportedFrom,
		SourceRevision:     branch.SourceRevision,
		SyncMode:           branch.SyncMode,
		RequestID:          requestID,
		Revision:           branch.Revision,
		CreatedAt:          createdAt,
		UpdatedAt:          branch.UpdatedAt,
		UpdatedByDid:       branch.UpdatedByDid,
		RetiredAt:          branch.RetiredAt,
	}
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	copy := value
	return &copy
}

func optionalInt64(value int64) *int64 {
	if value == 0 {
		return nil
	}
	copy := value
	return &copy
}
