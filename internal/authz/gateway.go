package authz

import (
	"errors"
	"net/http"
	"strings"
)

const (
	HeaderActorDID        = "X-Cerulia-Actor-Did"
	HeaderPermissionSets  = "X-Cerulia-Permission-Sets"
	CoreReader            = "app.cerulia.authCoreReader"
	CoreWriter            = "app.cerulia.authCoreWriter"
	CorePublicationWriter = "app.cerulia.authCorePublicationOperator"
	ReuseOperator         = "app.cerulia.authReuseOperator"
	AuditReader           = "app.cerulia.authAuditReader"
	SessionParticipant    = "app.cerulia.authSessionParticipant"
	GovernanceOperator    = "app.cerulia.authGovernanceOperator"
)

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrUnknownLXM   = errors.New("unknown lxm")
)

type Subject struct {
	ActorDID       string
	PermissionSets map[string]struct{}
	Anonymous      bool
}

type Gateway struct {
	requiredBundleByOperation map[string]string
}

func NewGateway() *Gateway {
	return &Gateway{
		requiredBundleByOperation: map[string]string{
			"app.cerulia.rpc.getCharacterHome":           CoreReader,
			"app.cerulia.rpc.getCampaignView":            CoreReader,
			"app.cerulia.rpc.getSessionAccessPreflight":  "",
			"app.cerulia.rpc.getSessionView":             SessionParticipant,
			"app.cerulia.rpc.getGovernanceView":          GovernanceOperator,
			"app.cerulia.rpc.listCharacterEpisodes":      CoreReader,
			"app.cerulia.rpc.listReuseGrants":            CoreReader,
			"app.cerulia.rpc.listPublications":           CoreReader,
			"app.cerulia.rpc.exportServiceLog":           AuditReader,
			"app.cerulia.rpc.createCampaign":             CoreWriter,
			"app.cerulia.rpc.createSessionDraft":         GovernanceOperator,
			"app.cerulia.rpc.openSession":                GovernanceOperator,
			"app.cerulia.rpc.startSession":               GovernanceOperator,
			"app.cerulia.rpc.pauseSession":               GovernanceOperator,
			"app.cerulia.rpc.resumeSession":              GovernanceOperator,
			"app.cerulia.rpc.closeSession":               GovernanceOperator,
			"app.cerulia.rpc.archiveSession":             GovernanceOperator,
			"app.cerulia.rpc.reopenSession":              GovernanceOperator,
			"app.cerulia.rpc.transferAuthority":          GovernanceOperator,
			"app.cerulia.rpc.inviteSession":              GovernanceOperator,
			"app.cerulia.rpc.cancelInvitation":           GovernanceOperator,
			"app.cerulia.rpc.joinSession":                SessionParticipant,
			"app.cerulia.rpc.leaveSession":               SessionParticipant,
			"app.cerulia.rpc.moderateMembership":         GovernanceOperator,
			"app.cerulia.rpc.attachRuleProfile":          CoreWriter,
			"app.cerulia.rpc.retireRuleProfile":          CoreWriter,
			"app.cerulia.rpc.importCharacterSheet":       CoreWriter,
			"app.cerulia.rpc.createCharacterBranch":      CoreWriter,
			"app.cerulia.rpc.updateCharacterBranch":      CoreWriter,
			"app.cerulia.rpc.retireCharacterBranch":      CoreWriter,
			"app.cerulia.rpc.recordCharacterAdvancement": CoreWriter,
			"app.cerulia.rpc.recordCharacterEpisode":     CoreWriter,
			"app.cerulia.rpc.recordCharacterConversion":  CoreWriter,
			"app.cerulia.rpc.publishSubject":             CorePublicationWriter,
			"app.cerulia.rpc.retirePublication":          CorePublicationWriter,
			"app.cerulia.rpc.grantReuse":                 ReuseOperator,
			"app.cerulia.rpc.revokeReuse":                ReuseOperator,
		},
	}
}

func (gateway *Gateway) AuthorizeRequest(request *http.Request, operationNSID string, allowAnonymous bool) (Subject, error) {
	requiredBundle, ok := gateway.requiredBundleByOperation[operationNSID]
	if !ok {
		return Subject{}, ErrUnknownLXM
	}

	subject := Subject{
		ActorDID:       strings.TrimSpace(request.Header.Get(HeaderActorDID)),
		PermissionSets: parsePermissionSets(request.Header.Get(HeaderPermissionSets)),
	}
	if subject.ActorDID == "" {
		if allowAnonymous {
			subject.Anonymous = true
			return subject, nil
		}
		return Subject{}, ErrUnauthorized
	}
	if requiredBundle == "" {
		return subject, nil
	}
	if _, ok := subject.PermissionSets[requiredBundle]; !ok {
		return Subject{}, ErrForbidden
	}
	return subject, nil
}

func parsePermissionSets(raw string) map[string]struct{} {
	items := map[string]struct{}{}
	for _, part := range strings.Split(raw, ",") {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		items[value] = struct{}{}
	}
	return items
}
