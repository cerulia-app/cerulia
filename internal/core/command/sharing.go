package command

import (
	"context"
	"time"

	"cerulia/internal/core/model"
	shareddomain "cerulia/internal/core/sharing"
	"cerulia/internal/ledger"
	"cerulia/internal/store"
)

func (service *Service) PublishSubject(ctx context.Context, actorDid string, input PublishSubjectInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.SubjectRef, "subjectRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.SubjectKind, "subjectKind"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.EntryURL, "entryUrl"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.PreferredSurfaceKind, "preferredSurfaceKind"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptySlice(input.Surfaces, "surfaces"); err != nil {
		return ledger.MutationAck{}, err
	}

	return service.executeMutation(ctx, input.SubjectRef, "app.cerulia.rpc.publishSubject", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if err := authorizePublicationActor(ctx, tx, actorDid, input.SubjectRef, input.SubjectKind); err != nil {
			return ledger.MutationAck{}, err
		}
		if input.ReuseGrantRef != "" {
			_, grant, err := decodeAppend[model.ReuseGrant](ctx, tx, input.ReuseGrantRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if grant.RevokedAt != nil {
				return rejectedAck(input.RequestID, "reuse grant is revoked"), nil
			}
		}

		currentHead, err := tx.GetCurrentHead(ctx, input.SubjectRef, input.SubjectKind)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if currentHead != nil {
			if input.ExpectedCurrentHeadRef == "" {
				return rejectedAck(input.RequestID, "expectedCurrentHeadRef is required"), nil
			}
			if currentHead.CurrentHeadRef != input.ExpectedCurrentHeadRef {
				return rejectedAck(input.RequestID, "publication head mismatch"), nil
			}
		}

		repoDID, err := refRepoDID(input.SubjectRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		publicationRef := appendRef(repoDID, model.CollectionPublication, "publication", input.RequestID)

		candidate := shareddomain.Publication{
			Ref:                  publicationRef,
			SubjectRef:           input.SubjectRef,
			SubjectKind:          input.SubjectKind,
			ReuseGrantRef:        input.ReuseGrantRef,
			EntryURL:             input.EntryURL,
			PreferredSurfaceKind: input.PreferredSurfaceKind,
			Surfaces:             toDomainSurfaces(input.Surfaces),
			Status:               "active",
			PublishedAt:          now,
		}

		var currentPublication *shareddomain.Publication
		if currentHead != nil {
			_, currentModel, err := decodeAppend[model.Publication](ctx, tx, currentHead.CurrentHeadRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			currentPublication = ptrPublication(modelToDomainPublication(currentHead.CurrentHeadRef, currentModel))
			candidate.SupersedesRef = currentHead.CurrentHeadRef
		}
		if err := shareddomain.ValidatePublicationHead(currentPublication, candidate); err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}

		storedPublication := model.Publication{
			SubjectRef:           input.SubjectRef,
			SubjectKind:          input.SubjectKind,
			ReuseGrantRef:        input.ReuseGrantRef,
			EntryURL:             input.EntryURL,
			PreferredSurfaceKind: input.PreferredSurfaceKind,
			Surfaces:             input.Surfaces,
			Status:               "active",
			SupersedesRef:        candidate.SupersedesRef,
			PublishedByDid:       actorDid,
			PublishedAt:          now,
			RequestID:            input.RequestID,
			Note:                 input.Note,
		}
		appendRecord, err := marshalAppend(model.CollectionPublication, publicationRef, input.SubjectRef, input.RequestID, now, storedPublication)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, appendRecord); err != nil {
			return ledger.MutationAck{}, err
		}

		nextHead, err := ledger.AdvanceCurrentHead(currentHead, ledger.HeadCandidate{
			SubjectRef:    input.SubjectRef,
			SubjectKind:   input.SubjectKind,
			HeadRef:       publicationRef,
			SupersedesRef: candidate.SupersedesRef,
			RequestID:     input.RequestID,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		if err := tx.PutCurrentHead(ctx, nextHead); err != nil {
			return ledger.MutationAck{}, err
		}

		ack := acceptedAck(input.RequestID, []string{publicationRef})
		ack.PublicationRef = publicationRef
		return ack, nil
	})
}

func (service *Service) RetirePublication(ctx context.Context, actorDid string, input RetirePublicationInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.PublicationRef, "publicationRef"); err != nil {
		return ledger.MutationAck{}, err
	}

	return service.executeMutation(ctx, input.PublicationRef, "app.cerulia.rpc.retirePublication", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		publicationRecord, publicationModel, err := decodeAppend[model.Publication](ctx, tx, input.PublicationRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := authorizePublicationActor(ctx, tx, actorDid, publicationModel.SubjectRef, publicationModel.SubjectKind); err != nil {
			return ledger.MutationAck{}, err
		}

		currentHead, err := tx.GetCurrentHead(ctx, publicationModel.SubjectRef, publicationModel.SubjectKind)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if currentHead == nil || currentHead.CurrentHeadRef != input.PublicationRef {
			return rejectedAck(input.RequestID, "publication is not the current head"), nil
		}

		retiredDomain, err := shareddomain.RetirePublication(modelToDomainPublication(input.PublicationRef, publicationModel), appendRef(publicationRecord.RepoDID, model.CollectionPublication, "publication", input.RequestID), now)
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}

		retiredModel := model.Publication{
			SubjectRef:           publicationModel.SubjectRef,
			SubjectKind:          publicationModel.SubjectKind,
			ReuseGrantRef:        publicationModel.ReuseGrantRef,
			EntryURL:             publicationModel.EntryURL,
			PreferredSurfaceKind: publicationModel.PreferredSurfaceKind,
			Surfaces:             fromDomainSurfaces(retiredDomain.Surfaces),
			Status:               retiredDomain.Status,
			SupersedesRef:        retiredDomain.SupersedesRef,
			PublishedByDid:       actorDid,
			PublishedAt:          publicationModel.PublishedAt,
			RetiredAt:            retiredDomain.RetiredAt,
			RequestID:            input.RequestID,
			Note:                 input.Note,
		}
		retiredRef := retiredDomain.Ref
		appendRecord, err := marshalAppend(model.CollectionPublication, retiredRef, publicationModel.SubjectRef, input.RequestID, now, retiredModel)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, appendRecord); err != nil {
			return ledger.MutationAck{}, err
		}

		nextHead, err := ledger.AdvanceCurrentHead(currentHead, ledger.HeadCandidate{
			HeadRef:       retiredRef,
			SupersedesRef: input.PublicationRef,
			RequestID:     input.RequestID,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		if err := tx.PutCurrentHead(ctx, nextHead); err != nil {
			return ledger.MutationAck{}, err
		}

		ack := acceptedAck(input.RequestID, []string{retiredRef})
		ack.PublicationRef = retiredRef
		return ack, nil
	})
}

func (service *Service) GrantReuse(ctx context.Context, actorDid string, input GrantReuseInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.CharacterBranchRef, "characterBranchRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.SourceCampaignRef, "sourceCampaignRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.TargetKind, "targetKind"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ReuseMode, "reuseMode"); err != nil {
		return ledger.MutationAck{}, err
	}

	return service.executeMutation(ctx, input.CharacterBranchRef, "app.cerulia.rpc.grantReuse", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		_, branchModel, err := decodeStable[model.CharacterBranch](ctx, tx, input.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if _, _, err := decodeStable[model.Campaign](ctx, tx, input.SourceCampaignRef); err != nil {
			return ledger.MutationAck{}, err
		}
		if !sameActor(actorDid, branchModel.OwnerDid) {
			return ledger.MutationAck{}, ErrForbidden
		}

		repoDID, err := refRepoDID(input.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		grantRef := appendRef(repoDID, model.CollectionReuseGrant, "reuse", input.RequestID)
		record := model.ReuseGrant{
			CharacterBranchRef: input.CharacterBranchRef,
			SourceCampaignRef:  input.SourceCampaignRef,
			TargetKind:         input.TargetKind,
			TargetRef:          input.TargetRef,
			TargetDid:          input.TargetDid,
			ReuseMode:          input.ReuseMode,
			GrantedByDid:       actorDid,
			GrantedAt:          now,
			ExpiresAt:          input.ExpiresAt,
			RequestID:          input.RequestID,
			Note:               input.Note,
		}
		if err := shareddomain.ValidateReuseGrant(shareddomain.ReuseGrant{
			CharacterBranchRef: record.CharacterBranchRef,
			SourceCampaignRef:  record.SourceCampaignRef,
			GrantedByDid:       record.GrantedByDid,
			GrantedAt:          record.GrantedAt,
			RequestID:          record.RequestID,
			RevokesRef:         record.RevokesRef,
			TargetKind:         record.TargetKind,
			TargetRef:          record.TargetRef,
			TargetDid:          record.TargetDid,
			ReuseMode:          record.ReuseMode,
		}); err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}

		appendRecord, err := marshalAppend(model.CollectionReuseGrant, grantRef, input.CharacterBranchRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, appendRecord); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{grantRef}), nil
	})
}

func (service *Service) RevokeReuse(ctx context.Context, actorDid string, input RevokeReuseInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.ReuseGrantRef, "reuseGrantRef"); err != nil {
		return ledger.MutationAck{}, err
	}
	if err := requireNonEmptyField(input.RevokeReasonCode, "revokeReasonCode"); err != nil {
		return ledger.MutationAck{}, err
	}

	return service.executeMutation(ctx, input.ReuseGrantRef, "app.cerulia.rpc.revokeReuse", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		grantRecord, grantModel, err := decodeAppend[model.ReuseGrant](ctx, tx, input.ReuseGrantRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		_, branchModel, err := decodeStable[model.CharacterBranch](ctx, tx, grantModel.CharacterBranchRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !sameActor(actorDid, branchModel.OwnerDid) {
			return ledger.MutationAck{}, ErrForbidden
		}
		if grantModel.RevokedAt != nil || reuseGrantHasSuccessor(ctx, tx, input.ReuseGrantRef) {
			return rejectedAck(input.RequestID, "reuse grant already revoked"), nil
		}

		revokedRef := appendRef(grantRecord.RepoDID, model.CollectionReuseGrant, "reuse", input.RequestID)
		revoked := grantModel
		revoked.RevokesRef = input.ReuseGrantRef
		revoked.RequestID = input.RequestID
		revoked.RevokedAt = ptrTime(now)
		revoked.RevokedByDid = actorDid
		revoked.RevokeReasonCode = input.RevokeReasonCode
		revoked.Note = input.Note
		appendRecord, err := marshalAppend(model.CollectionReuseGrant, revokedRef, grantModel.CharacterBranchRef, input.RequestID, now, revoked)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, appendRecord); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{revokedRef}), nil
	})
}

func authorizePublicationActor(ctx context.Context, reader store.Reader, actorDid string, subjectRef string, subjectKind string) error {
	switch subjectKind {
	case "campaign":
		_, campaignModel, err := decodeStable[model.Campaign](ctx, reader, subjectRef)
		if err != nil {
			return err
		}
		if !sameActor(actorDid, campaignModel.StewardDids...) {
			return ErrForbidden
		}
	case "character-branch":
		_, branchModel, err := decodeStable[model.CharacterBranch](ctx, reader, subjectRef)
		if err != nil {
			return err
		}
		if !sameActor(actorDid, branchModel.OwnerDid) {
			return ErrForbidden
		}
	case "character-episode":
		_, episodeModel, err := decodeAppend[model.CharacterEpisode](ctx, reader, subjectRef)
		if err != nil {
			return err
		}
		_, branchModel, err := decodeStable[model.CharacterBranch](ctx, reader, episodeModel.CharacterBranchRef)
		if err != nil {
			return err
		}
		if !sameActor(actorDid, episodeModel.RecordedByDid, branchModel.OwnerDid) {
			return ErrForbidden
		}
	default:
		return ErrInvalidInput
	}

	return nil
}

func toDomainSurfaces(values []model.SurfaceDescriptor) []shareddomain.SurfaceDescriptor {
	items := make([]shareddomain.SurfaceDescriptor, 0, len(values))
	for _, value := range values {
		items = append(items, shareddomain.SurfaceDescriptor{
			SurfaceKind: value.SurfaceKind,
			PurposeKind: value.PurposeKind,
			SurfaceURI:  value.SurfaceURI,
			Status:      value.Status,
			RetiredAt:   value.RetiredAt,
		})
	}
	return items
}

func fromDomainSurfaces(values []shareddomain.SurfaceDescriptor) []model.SurfaceDescriptor {
	items := make([]model.SurfaceDescriptor, 0, len(values))
	for _, value := range values {
		items = append(items, model.SurfaceDescriptor{
			SurfaceKind: value.SurfaceKind,
			PurposeKind: value.PurposeKind,
			SurfaceURI:  value.SurfaceURI,
			Status:      value.Status,
			RetiredAt:   value.RetiredAt,
		})
	}
	return items
}

func modelToDomainPublication(ref string, record model.Publication) shareddomain.Publication {
	return shareddomain.Publication{
		Ref:                  ref,
		SubjectRef:           record.SubjectRef,
		SubjectKind:          record.SubjectKind,
		ReuseGrantRef:        record.ReuseGrantRef,
		EntryURL:             record.EntryURL,
		PreferredSurfaceKind: record.PreferredSurfaceKind,
		Surfaces:             toDomainSurfaces(record.Surfaces),
		Status:               record.Status,
		SupersedesRef:        record.SupersedesRef,
		PublishedAt:          record.PublishedAt,
		RetiredAt:            record.RetiredAt,
	}
}

func ptrPublication(publication shareddomain.Publication) *shareddomain.Publication {
	copy := publication
	return &copy
}

func ptrTime(value time.Time) *time.Time {
	copy := value
	return &copy
}

func reuseGrantHasSuccessor(ctx context.Context, reader store.Reader, ref string) bool {
	grants, err := reader.ListAppendByCollection(ctx, model.CollectionReuseGrant)
	if err != nil {
		return false
	}
	for _, record := range grants {
		grant, err := model.UnmarshalAppend[model.ReuseGrant](record)
		if err != nil {
			continue
		}
		if grant.RevokesRef == ref {
			return true
		}
	}
	return false
}
