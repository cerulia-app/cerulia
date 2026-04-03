package command

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"slices"
	"strings"
	"time"

	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

const (
	audienceStatusActive   = "active"
	audienceStatusRotating = "rotating"
	audienceStatusRetired  = "retired"
	revealHeadKind         = "reveal-event"
	redactionHeadKind      = "redaction-event"
	runtimeChannelPublic   = "public"
	runtimeChannelSystem   = "system"
)

type audienceGrantRecord struct {
	ref    string
	record store.StableRecord
	value  runmodel.AudienceGrant
}

type membershipHeadRecord struct {
	ref   string
	value runmodel.Membership
}

func newAudienceRef(sessionRef string, audienceID string) (string, error) {
	parts, err := store.ParseRef(sessionRef)
	if err != nil {
		return "", err
	}
	return store.BuildRef(parts.RepoDID, runmodel.CollectionAudience, audienceID), nil
}

func audienceGrantRef(audienceRef string, actorDid string) (string, error) {
	parts, err := store.ParseRef(audienceRef)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(audienceRef + "\n" + strings.TrimSpace(actorDid)))
	return store.BuildRef(parts.RepoDID, runmodel.CollectionAudienceGrant, parts.RecordKey+"-grant-"+hex.EncodeToString(sum[:6])), nil
}

func wrappedKeyForAudience(audienceRef string, actorDid string, keyVersion int64) string {
	sum := sha256.Sum256([]byte(audienceRef + "\n" + strings.TrimSpace(actorDid) + fmt.Sprintf("\n%d", keyVersion)))
	return "wrapped:" + hex.EncodeToString(sum[:12])
}

func normalizeActors(values []string) []string {
	seen := map[string]struct{}{}
	items := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		items = append(items, trimmed)
	}
	slices.Sort(items)
	return items
}

func newExplicitAudience(sessionRef string, audienceID string, title string, actorDids []string, snapshotSourceRequestID string, requestID string, actorDid string, now time.Time) runmodel.Audience {
	return runmodel.Audience{
		SessionRef:              sessionRef,
		AudienceID:              audienceID,
		Title:                   title,
		AudienceKind:            "explicit",
		SelectorPolicyKind:      "explicit-members",
		ActorDids:               normalizeActors(actorDids),
		SnapshotSourceRequestID: snapshotSourceRequestID,
		RequestID:               requestID,
		KeyVersion:              1,
		Status:                  audienceStatusActive,
		UpdatedByDid:            actorDid,
		CreatedAt:               now,
		UpdatedAt:               now,
	}
}

func (service *Service) createExplicitAudienceWithGrants(ctx context.Context, tx store.Tx, sessionRef string, audienceID string, title string, actorDids []string, snapshotSourceRequestID string, requestID string, actorDid string, now time.Time) (string, []string, error) {
	audienceRef, err := newAudienceRef(sessionRef, audienceID)
	if err != nil {
		return "", nil, err
	}
	audience := newExplicitAudience(sessionRef, audienceID, title, actorDids, snapshotSourceRequestID, requestID, actorDid, now)
	storedAudience, err := marshalStable(runmodel.CollectionAudience, audienceRef, requestID, 1, now, now, audience)
	if err != nil {
		return "", nil, err
	}
	if err := tx.PutStable(ctx, storedAudience); err != nil {
		return "", nil, err
	}
	grantRefs, err := service.syncAudienceGrantSet(ctx, tx, audience, normalizeActors(actorDids), requestID, actorDid, now)
	if err != nil {
		return "", nil, err
	}
	return audienceRef, grantRefs, nil
}

func (service *Service) loadAudience(ctx context.Context, reader store.Reader, audienceRef string) (store.StableRecord, runmodel.Audience, error) {
	return decodeRunStable[runmodel.Audience](ctx, reader, audienceRef)
}

func (service *Service) requireAudienceForSession(ctx context.Context, reader store.Reader, sessionRef string, audienceRef string) (store.StableRecord, runmodel.Audience, error) {
	record, audience, err := service.loadAudience(ctx, reader, audienceRef)
	if err != nil {
		return store.StableRecord{}, runmodel.Audience{}, err
	}
	if audience.SessionRef != sessionRef {
		return store.StableRecord{}, runmodel.Audience{}, ErrForbidden
	}
	return record, audience, nil
}

func (service *Service) listAudienceGrantRecords(ctx context.Context, reader store.Reader, audienceRef string) ([]audienceGrantRecord, error) {
	records, err := reader.ListStableByCollection(ctx, runmodel.CollectionAudienceGrant)
	if err != nil {
		return nil, err
	}
	items := make([]audienceGrantRecord, 0)
	for _, record := range records {
		value, err := runmodel.UnmarshalStable[runmodel.AudienceGrant](record)
		if err != nil {
			return nil, err
		}
		if value.AudienceRef != audienceRef {
			continue
		}
		items = append(items, audienceGrantRecord{ref: record.Ref, record: record, value: value})
	}
	slices.SortFunc(items, func(left audienceGrantRecord, right audienceGrantRecord) int {
		return strings.Compare(left.value.ActorDid, right.value.ActorDid)
	})
	return items, nil
}

func (service *Service) syncAudienceGrantSet(ctx context.Context, tx store.Tx, audience runmodel.Audience, recipients []string, requestID string, actorDid string, now time.Time) ([]string, error) {
	recipientList := normalizeActors(recipients)
	audienceRef := audienceRefForRecord(audience)
	if audienceRef == "" {
		return nil, ErrInvalidInput
	}
	existing, err := service.listAudienceGrantRecords(ctx, tx, audienceRef)
	if err != nil {
		return nil, err
	}
	return service.syncAudienceGrantSetWithExisting(ctx, tx, audience, recipientList, existing, requestID, actorDid, now)
}

func (service *Service) syncAudienceGrantSetWithExisting(ctx context.Context, tx store.Tx, audience runmodel.Audience, recipients []string, existing []audienceGrantRecord, requestID string, actorDid string, now time.Time) ([]string, error) {
	recipientSet := map[string]struct{}{}
	for _, recipient := range normalizeActors(recipients) {
		recipientSet[recipient] = struct{}{}
	}
	existingByActor := map[string]audienceGrantRecord{}
	for _, item := range existing {
		existingByActor[item.value.ActorDid] = item
	}
	updatedRefs := make([]string, 0, len(recipientSet)+len(existingByActor))
	for _, recipient := range normalizeActors(recipients) {
		ref, err := audienceGrantRef(audienceRefForRecord(audience), recipient)
		if err != nil {
			return nil, err
		}
		existingGrant, ok := existingByActor[recipient]
		revision := int64(1)
		createdAt := now
		if ok {
			revision = existingGrant.record.Revision + 1
			createdAt = existingGrant.record.CreatedAt
		}
		grant := runmodel.AudienceGrant{
			AudienceRef:  audienceRefForRecord(audience),
			ActorDid:     recipient,
			RequestID:    requestID,
			KeyVersion:   audience.KeyVersion,
			WrappedKey:   wrappedKeyForAudience(audienceRefForRecord(audience), recipient, audience.KeyVersion),
			GrantStatus:  "active",
			ValidFrom:    now,
			GrantedByDid: actorDid,
			UpdatedAt:    now,
		}
		stored, err := marshalStable(runmodel.CollectionAudienceGrant, ref, requestID, revision, createdAt, now, grant)
		if err != nil {
			return nil, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return nil, err
		}
		updatedRefs = append(updatedRefs, ref)
	}
	for actorDidExisting, item := range existingByActor {
		if _, ok := recipientSet[actorDidExisting]; ok || item.value.GrantStatus == "revoked" {
			continue
		}
		grant := item.value
		grant.RequestID = requestID
		grant.GrantStatus = "revoked"
		revokedAt := now
		grant.RevokedAt = &revokedAt
		grant.RevokedByDid = actorDid
		grant.RevokeReasonCode = "audience-rotation"
		grant.UpdatedAt = now
		stored, err := marshalStable(runmodel.CollectionAudienceGrant, item.ref, requestID, item.record.Revision+1, item.record.CreatedAt, now, grant)
		if err != nil {
			return nil, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return nil, err
		}
		updatedRefs = append(updatedRefs, item.ref)
	}
	slices.Sort(updatedRefs)
	return updatedRefs, nil
}

func (service *Service) retireAudienceAndGrants(ctx context.Context, tx store.Tx, audienceRef string, requestID string, actorDid string, reasonCode string, now time.Time) ([]string, error) {
	record, audience, err := service.loadAudience(ctx, tx, audienceRef)
	if err != nil {
		return nil, err
	}
	if audience.Status != audienceStatusRetired {
		audience.RequestID = requestID
		audience.Status = audienceStatusRetired
		audience.UpdatedByDid = actorDid
		audience.StatusReasonCode = reasonCode
		audience.UpdatedAt = now
		storedAudience, err := marshalStable(runmodel.CollectionAudience, audienceRef, requestID, record.Revision+1, record.CreatedAt, now, audience)
		if err != nil {
			return nil, err
		}
		if err := tx.PutStable(ctx, storedAudience); err != nil {
			return nil, err
		}
	}
	existing, err := service.listAudienceGrantRecords(ctx, tx, audienceRef)
	if err != nil {
		return nil, err
	}
	updatedRefs := make([]string, 0, len(existing))
	for _, item := range existing {
		if item.value.GrantStatus == "revoked" {
			continue
		}
		grant := item.value
		grant.RequestID = requestID
		grant.GrantStatus = "revoked"
		revokedAt := now
		grant.RevokedAt = &revokedAt
		grant.RevokedByDid = actorDid
		grant.RevokeReasonCode = reasonCode
		grant.UpdatedAt = now
		storedGrant, err := marshalStable(runmodel.CollectionAudienceGrant, item.ref, requestID, item.record.Revision+1, item.record.CreatedAt, now, grant)
		if err != nil {
			return nil, err
		}
		if err := tx.PutStable(ctx, storedGrant); err != nil {
			return nil, err
		}
		updatedRefs = append(updatedRefs, item.ref)
	}
	slices.Sort(updatedRefs)
	return updatedRefs, nil
}

func (service *Service) resolveAudienceRecipients(ctx context.Context, reader store.Reader, audience runmodel.Audience, now time.Time) ([]string, error) {
	switch audience.SelectorPolicyKind {
	case "explicit-members":
		return normalizeActors(audience.ActorDids), nil
	case "role-members", "derived-membership":
		if audience.SessionRef == "" {
			return nil, ErrInvalidInput
		}
		if len(audience.SessionStates) > 0 {
			_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, reader, audience.SessionRef)
			if err != nil {
				return nil, err
			}
			if !containsString(audience.SessionStates, sessionModel.State) {
				return nil, nil
			}
		}
		memberships, err := service.currentMembershipHeadsForSession(ctx, reader, audience.SessionRef)
		if err != nil {
			return nil, err
		}
		items := make([]string, 0, len(memberships))
		for _, membership := range memberships {
			if len(audience.Roles) > 0 && !containsString(audience.Roles, membership.value.Role) {
				continue
			}
			statuses := audience.MembershipStatuses
			if len(statuses) == 0 {
				statuses = []string{"joined"}
			}
			if !containsString(statuses, membership.value.Status) {
				continue
			}
			items = append(items, membership.value.ActorDid)
		}
		return normalizeActors(items), nil
	default:
		return nil, ErrInvalidInput
	}
}

func audienceRefForRecord(audience runmodel.Audience) string {
	ref, err := newAudienceRef(audience.SessionRef, audience.AudienceID)
	if err != nil {
		return ""
	}
	return ref
}

func containsString(values []string, target string) bool {
	trimmed := strings.TrimSpace(target)
	for _, value := range values {
		if strings.TrimSpace(value) == trimmed {
			return true
		}
	}
	return false
}

func (service *Service) currentMembershipHeadsForSession(ctx context.Context, reader store.Reader, sessionRef string) ([]membershipHeadRecord, error) {
	records, err := reader.ListStableByCollection(ctx, runmodel.CollectionMembership)
	if err != nil {
		return nil, err
	}
	superseded := map[string]struct{}{}
	candidates := map[string]runmodel.Membership{}
	for _, record := range records {
		value, err := runmodel.UnmarshalStable[runmodel.Membership](record)
		if err != nil {
			return nil, err
		}
		if value.SessionRef != sessionRef {
			continue
		}
		candidates[record.Ref] = value
		if value.SupersedesRef != "" {
			superseded[value.SupersedesRef] = struct{}{}
		}
	}
	items := make([]membershipHeadRecord, 0, len(candidates))
	for ref, value := range candidates {
		if _, ok := superseded[ref]; ok {
			continue
		}
		items = append(items, membershipHeadRecord{ref: ref, value: value})
	}
	slices.SortFunc(items, func(left membershipHeadRecord, right membershipHeadRecord) int {
		return strings.Compare(left.value.ActorDid, right.value.ActorDid)
	})
	return items, nil
}
