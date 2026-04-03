package command

import (
	"context"
	"time"

	coremodel "cerulia/internal/core/model"
	"cerulia/internal/ledger"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

const sessionPublicationHeadKind = "session-publication"

type PublishSessionLinkInput struct {
	SessionRef                        string                        `json:"sessionRef"`
	PublicationRef                    string                        `json:"publicationRef"`
	ExpectedPublicationHeadRef        string                        `json:"expectedPublicationHeadRef"`
	ExpectedSessionPublicationHeadRef string                        `json:"expectedSessionPublicationHeadRef,omitempty"`
	EntryURL                          string                        `json:"entryUrl"`
	ReplayURL                         string                        `json:"replayUrl,omitempty"`
	PreferredSurfaceKind              string                        `json:"preferredSurfaceKind"`
	Surfaces                          []coremodel.SurfaceDescriptor `json:"surfaces"`
	RequestID                         string                        `json:"requestId"`
}

type RetireSessionLinkInput struct {
	SessionRef                 string `json:"sessionRef"`
	SessionPublicationRef      string `json:"sessionPublicationRef"`
	ExpectedPublicationHeadRef string `json:"expectedPublicationHeadRef"`
	RequestID                  string `json:"requestId"`
}

func (service *Service) PublishSessionLink(ctx context.Context, actorDid string, input PublishSessionLinkInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.publishSessionLink", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if _, err := service.requireAuthority(ctx, tx, sessionModel.AuthorityRef, actorDid, true); err != nil {
			return ledger.MutationAck{}, err
		}

		_, publicationModel, err := decodeRunCorePublication(ctx, tx, input.PublicationRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		publicationHead, err := tx.GetCurrentHead(ctx, publicationModel.SubjectRef, publicationModel.SubjectKind)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if publicationHead == nil || publicationHead.CurrentHeadRef != input.ExpectedPublicationHeadRef || input.PublicationRef != publicationHead.CurrentHeadRef {
			return rejectedAck(input.RequestID, "publication head mismatch"), nil
		}

		currentHead, err := tx.GetCurrentHead(ctx, input.SessionRef, sessionPublicationHeadKind)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if currentHead == nil {
			if input.ExpectedSessionPublicationHeadRef != "" {
				return rejectedAck(input.RequestID, "session publication head mismatch"), nil
			}
		} else if currentHead.CurrentHeadRef != input.ExpectedSessionPublicationHeadRef {
			return rejectedAck(input.RequestID, "session publication head mismatch"), nil
		}

		repoDID, err := refRepoDID(input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		sessionPublicationRef := appendRef(repoDID, runmodel.CollectionSessionPublication, "session-publication", input.RequestID)
		record := runmodel.SessionPublication{
			SessionRef:           input.SessionRef,
			PublicationRef:       input.PublicationRef,
			EntryURL:             input.EntryURL,
			ReplayURL:            input.ReplayURL,
			PreferredSurfaceKind: input.PreferredSurfaceKind,
			Surfaces:             append([]coremodel.SurfaceDescriptor(nil), input.Surfaces...),
			RequestID:            input.RequestID,
			PublishedByDid:       actorDid,
			PublishedAt:          now,
			UpdatedByDid:         actorDid,
			UpdatedAt:            now,
		}
		if currentHead != nil {
			record.SupersedesRef = currentHead.CurrentHeadRef
			_, previous, err := decodeRunAppend[runmodel.SessionPublication](ctx, tx, currentHead.CurrentHeadRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			record.PublishedByDid = previous.PublishedByDid
			record.PublishedAt = previous.PublishedAt
		}

		appendRecord, err := marshalAppend(runmodel.CollectionSessionPublication, sessionPublicationRef, input.SessionRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, appendRecord); err != nil {
			return ledger.MutationAck{}, err
		}

		nextHead, err := ledger.AdvanceCurrentHead(currentHead, ledger.HeadCandidate{
			SubjectRef:    input.SessionRef,
			SubjectKind:   sessionPublicationHeadKind,
			HeadRef:       sessionPublicationRef,
			SupersedesRef: record.SupersedesRef,
			RequestID:     input.RequestID,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		if err := tx.PutCurrentHead(ctx, nextHead); err != nil {
			return ledger.MutationAck{}, err
		}

		ack := acceptedAck(input.RequestID, []string{sessionPublicationRef})
		ack.SessionPublicationRef = sessionPublicationRef
		ack.PublicationRef = input.PublicationRef
		return ack, nil
	})
}

func (service *Service) RetireSessionLink(ctx context.Context, actorDid string, input RetireSessionLinkInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.retireSessionLink", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if _, err := service.requireAuthority(ctx, tx, sessionModel.AuthorityRef, actorDid, true); err != nil {
			return ledger.MutationAck{}, err
		}

		currentHead, err := tx.GetCurrentHead(ctx, input.SessionRef, sessionPublicationHeadKind)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if currentHead == nil || currentHead.CurrentHeadRef != input.SessionPublicationRef {
			return rejectedAck(input.RequestID, "session publication is not the current head"), nil
		}

		publicationRecord, publicationModel, err := decodeRunAppend[runmodel.SessionPublication](ctx, tx, input.SessionPublicationRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}

		corePublicationRecord, corePublicationModel, err := decodeRunCorePublication(ctx, tx, publicationModel.PublicationRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		_ = corePublicationRecord
		publicationHead, err := tx.GetCurrentHead(ctx, corePublicationModel.SubjectRef, corePublicationModel.SubjectKind)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if publicationHead == nil || publicationHead.CurrentHeadRef != input.ExpectedPublicationHeadRef {
			return rejectedAck(input.RequestID, "publication head mismatch"), nil
		}

		repoDID := publicationRecord.RepoDID
		retiredRef := appendRef(repoDID, runmodel.CollectionSessionPublication, "session-publication", input.RequestID)
		retiredAt := now
		retired := runmodel.SessionPublication{
			SessionRef:           publicationModel.SessionRef,
			PublicationRef:       publicationModel.PublicationRef,
			EntryURL:             publicationModel.EntryURL,
			ReplayURL:            publicationModel.ReplayURL,
			PreferredSurfaceKind: publicationModel.PreferredSurfaceKind,
			Surfaces:             append([]coremodel.SurfaceDescriptor(nil), publicationModel.Surfaces...),
			SupersedesRef:        input.SessionPublicationRef,
			RequestID:            input.RequestID,
			PublishedByDid:       publicationModel.PublishedByDid,
			PublishedAt:          publicationModel.PublishedAt,
			UpdatedByDid:         actorDid,
			UpdatedAt:            now,
			RetiredAt:            &retiredAt,
			RetireReasonCode:     "publication-retired",
		}
		for index := range retired.Surfaces {
			retired.Surfaces[index].Status = "retired"
			retired.Surfaces[index].RetiredAt = &retiredAt
		}

		appendRecord, err := marshalAppend(runmodel.CollectionSessionPublication, retiredRef, input.SessionRef, input.RequestID, now, retired)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, appendRecord); err != nil {
			return ledger.MutationAck{}, err
		}

		nextHead, err := ledger.AdvanceCurrentHead(currentHead, ledger.HeadCandidate{
			HeadRef:       retiredRef,
			SupersedesRef: input.SessionPublicationRef,
			RequestID:     input.RequestID,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		if err := tx.PutCurrentHead(ctx, nextHead); err != nil {
			return ledger.MutationAck{}, err
		}

		ack := acceptedAck(input.RequestID, []string{retiredRef})
		ack.SessionPublicationRef = retiredRef
		ack.PublicationRef = publicationModel.PublicationRef
		return ack, nil
	})
}

func decodeRunCorePublication(ctx context.Context, reader store.Reader, ref string) (store.AppendRecord, coremodel.Publication, error) {
	record, err := reader.GetAppend(ctx, ref)
	if err != nil {
		return store.AppendRecord{}, coremodel.Publication{}, err
	}
	value, err := coremodel.UnmarshalAppend[coremodel.Publication](record)
	if err != nil {
		return store.AppendRecord{}, coremodel.Publication{}, err
	}
	return record, value, nil
}
