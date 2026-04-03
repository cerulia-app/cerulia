package authz

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	HeaderActorDID        = "X-Cerulia-Actor-Did"
	HeaderPermissionSets  = "X-Cerulia-Permission-Sets"
	HeaderAuthTimestamp   = "X-Cerulia-Auth-Timestamp"
	HeaderAuthNonce       = "X-Cerulia-Auth-Nonce"
	HeaderAuthSignature   = "X-Cerulia-Auth-Signature"
	CoreReader            = "app.cerulia.authCoreReader"
	CoreWriter            = "app.cerulia.authCoreWriter"
	CorePublicationWriter = "app.cerulia.authCorePublicationOperator"
	ReuseOperator         = "app.cerulia.authReuseOperator"
	AuditReader           = "app.cerulia.authAuditReader"
	SessionParticipant    = "app.cerulia.authSessionParticipant"
	GovernanceOperator    = "app.cerulia.authGovernanceOperator"
	PublicationOperator   = "app.cerulia.authPublicationOperator"
	AppealOriginator      = "app.cerulia.authAppealOriginator"
	AppealResolver        = "app.cerulia.authAppealResolver"
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

func (subject Subject) HasPermissionSet(permissionSet string) bool {
	_, ok := subject.PermissionSets[permissionSet]
	return ok
}

func (subject Subject) HasAnyPermissionSet(permissionSets ...string) bool {
	for _, permissionSet := range permissionSets {
		if subject.HasPermissionSet(permissionSet) {
			return true
		}
	}
	return false
}

type Gateway struct {
	requiredBundlesByOperation map[string][]string
	trustedProxyHMACSecret     string
	trustedProxyMaxSkew        time.Duration
	allowInsecureDirect        bool
	mu                         sync.Mutex
	usedNonces                 map[string]time.Time
}

type Config struct {
	TrustedProxyHMACSecret string
	TrustedProxyMaxSkew    time.Duration
	AllowInsecureDirect    bool
}

func NewGateway(configs ...Config) *Gateway {
	config := Config{
		TrustedProxyMaxSkew: 5 * time.Minute,
	}
	if len(configs) > 0 {
		config = configs[0]
		if config.TrustedProxyMaxSkew <= 0 {
			config.TrustedProxyMaxSkew = 5 * time.Minute
		}
	}
	return &Gateway{
		requiredBundlesByOperation: map[string][]string{
			"app.cerulia.rpc.getCharacterHome":           {CoreReader},
			"app.cerulia.rpc.getCampaignView":            {CoreReader},
			"app.cerulia.rpc.getSessionAccessPreflight":  nil,
			"app.cerulia.rpc.getSessionView":             {SessionParticipant},
			"app.cerulia.rpc.getGovernanceView":          {GovernanceOperator},
			"app.cerulia.rpc.listCharacterEpisodes":      {CoreReader},
			"app.cerulia.rpc.listReuseGrants":            {CoreReader},
			"app.cerulia.rpc.listPublications":           {CoreReader},
			"app.cerulia.rpc.listSessionPublications":    {GovernanceOperator},
			"app.cerulia.rpc.listAppealCases":            {AppealOriginator, AppealResolver},
			"app.cerulia.rpc.exportServiceLog":           {AuditReader},
			"app.cerulia.rpc.createCampaign":             {CoreWriter},
			"app.cerulia.rpc.createSessionDraft":         {GovernanceOperator},
			"app.cerulia.rpc.openSession":                {GovernanceOperator},
			"app.cerulia.rpc.startSession":               {GovernanceOperator},
			"app.cerulia.rpc.pauseSession":               {GovernanceOperator},
			"app.cerulia.rpc.resumeSession":              {GovernanceOperator},
			"app.cerulia.rpc.closeSession":               {GovernanceOperator},
			"app.cerulia.rpc.archiveSession":             {GovernanceOperator},
			"app.cerulia.rpc.reopenSession":              {GovernanceOperator},
			"app.cerulia.rpc.transferAuthority":          {GovernanceOperator},
			"app.cerulia.rpc.inviteSession":              {GovernanceOperator},
			"app.cerulia.rpc.cancelInvitation":           {GovernanceOperator},
			"app.cerulia.rpc.joinSession":                {SessionParticipant},
			"app.cerulia.rpc.leaveSession":               {SessionParticipant},
			"app.cerulia.rpc.moderateMembership":         {GovernanceOperator},
			"app.cerulia.rpc.publishSessionLink":         {PublicationOperator},
			"app.cerulia.rpc.retireSessionLink":          {PublicationOperator},
			"app.cerulia.rpc.createCharacterInstance":    {GovernanceOperator},
			"app.cerulia.rpc.updateCharacterState":       {SessionParticipant, GovernanceOperator},
			"app.cerulia.rpc.createSecretEnvelope":       {SessionParticipant, GovernanceOperator},
			"app.cerulia.rpc.sendMessage":                {SessionParticipant, GovernanceOperator},
			"app.cerulia.rpc.rollDice":                   {SessionParticipant, GovernanceOperator},
			"app.cerulia.rpc.submitAction":               {GovernanceOperator},
			"app.cerulia.rpc.submitAppeal":               {AppealOriginator, AppealResolver},
			"app.cerulia.rpc.withdrawAppeal":             {AppealOriginator, AppealResolver},
			"app.cerulia.rpc.reviewAppeal":               {AppealResolver},
			"app.cerulia.rpc.escalateAppeal":             {AppealResolver},
			"app.cerulia.rpc.resolveAppeal":              {AppealResolver},
			"app.cerulia.rpc.revealSubject":              {GovernanceOperator},
			"app.cerulia.rpc.redactRecord":               {GovernanceOperator},
			"app.cerulia.rpc.rotateAudienceKey":          {GovernanceOperator},
			"app.cerulia.rpc.attachRuleProfile":          {CoreWriter},
			"app.cerulia.rpc.retireRuleProfile":          {CoreWriter},
			"app.cerulia.rpc.importCharacterSheet":       {CoreWriter},
			"app.cerulia.rpc.createCharacterBranch":      {CoreWriter},
			"app.cerulia.rpc.updateCharacterBranch":      {CoreWriter},
			"app.cerulia.rpc.retireCharacterBranch":      {CoreWriter},
			"app.cerulia.rpc.recordCharacterAdvancement": {CoreWriter},
			"app.cerulia.rpc.recordCharacterEpisode":     {CoreWriter},
			"app.cerulia.rpc.recordCharacterConversion":  {CoreWriter},
			"app.cerulia.rpc.publishSubject":             {CorePublicationWriter},
			"app.cerulia.rpc.retirePublication":          {CorePublicationWriter},
			"app.cerulia.rpc.grantReuse":                 {ReuseOperator},
			"app.cerulia.rpc.revokeReuse":                {ReuseOperator},
		},
		trustedProxyHMACSecret: strings.TrimSpace(config.TrustedProxyHMACSecret),
		trustedProxyMaxSkew:    config.TrustedProxyMaxSkew,
		allowInsecureDirect:    config.AllowInsecureDirect,
		usedNonces:             map[string]time.Time{},
	}
}

func (gateway *Gateway) AuthorizeRequest(request *http.Request, operationNSID string, allowAnonymous bool) (Subject, error) {
	requiredBundles, ok := gateway.requiredBundlesByOperation[operationNSID]
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
	if !gateway.verifyRequest(request, subject, operationNSID) {
		return Subject{}, ErrUnauthorized
	}
	if allowAnonymous {
		return subject, nil
	}
	if len(requiredBundles) == 0 {
		return subject, nil
	}
	for _, requiredBundle := range requiredBundles {
		if _, ok := subject.PermissionSets[requiredBundle]; ok {
			return subject, nil
		}
	}
	return Subject{}, ErrForbidden
}

func (gateway *Gateway) verifyRequest(request *http.Request, subject Subject, operationNSID string) bool {
	if subject.ActorDID == "" {
		return false
	}
	if gateway.allowInsecureDirect && gateway.trustedProxyHMACSecret == "" {
		return true
	}
	if gateway.trustedProxyHMACSecret == "" {
		return false
	}
	timestampRaw := strings.TrimSpace(request.Header.Get(HeaderAuthTimestamp))
	nonce := strings.TrimSpace(request.Header.Get(HeaderAuthNonce))
	signatureRaw := strings.TrimSpace(request.Header.Get(HeaderAuthSignature))
	if timestampRaw == "" || nonce == "" || signatureRaw == "" {
		return false
	}
	timestampUnix, err := strconv.ParseInt(timestampRaw, 10, 64)
	if err != nil {
		return false
	}
	timestamp := time.Unix(timestampUnix, 0).UTC()
	now := time.Now().UTC()
	if gateway.trustedProxyMaxSkew > 0 {
		delta := now.Sub(timestamp)
		if delta < 0 {
			delta = -delta
		}
		if delta > gateway.trustedProxyMaxSkew {
			return false
		}
	}
	canonical, err := canonicalSignaturePayload(request, subject, operationNSID, timestampRaw, nonce)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(gateway.trustedProxyHMACSecret))
	_, _ = mac.Write([]byte(canonical))
	expected := mac.Sum(nil)
	provided, err := hex.DecodeString(signatureRaw)
	if err != nil {
		return false
	}
	if subtle.ConstantTimeCompare(expected, provided) != 1 {
		return false
	}
	return gateway.consumeNonce(subject.ActorDID, nonce, now)
}

func canonicalSignaturePayload(request *http.Request, subject Subject, operationNSID string, timestampRaw string, nonce string) (string, error) {
	bodyDigest, err := requestBodyDigest(request)
	if err != nil {
		return "", err
	}
	canonicalBundles := canonicalPermissionSetList(subject.PermissionSets)
	return strings.Join([]string{
		subject.ActorDID,
		strings.Join(canonicalBundles, ","),
		timestampRaw,
		nonce,
		operationNSID,
		request.Method,
		request.URL.EscapedPath(),
		request.URL.RawQuery,
		bodyDigest,
	}, "\n"), nil
}

func requestBodyDigest(request *http.Request) (string, error) {
	var body []byte
	if request.Body != nil {
		readBody, err := io.ReadAll(request.Body)
		if err != nil {
			return "", err
		}
		body = readBody
		request.Body = io.NopCloser(bytes.NewReader(body))
	}
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:]), nil
}

func (gateway *Gateway) consumeNonce(actorDID string, nonce string, now time.Time) bool {
	if nonce == "" {
		return false
	}
	ttl := gateway.trustedProxyMaxSkew
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	gateway.mu.Lock()
	defer gateway.mu.Unlock()
	for key, expiresAt := range gateway.usedNonces {
		if !expiresAt.After(now) {
			delete(gateway.usedNonces, key)
		}
	}
	key := actorDID + "\n" + nonce
	if expiresAt, ok := gateway.usedNonces[key]; ok && expiresAt.After(now) {
		return false
	}
	gateway.usedNonces[key] = now.Add(ttl)
	return true
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

func canonicalPermissionSetList(values map[string]struct{}) []string {
	items := make([]string, 0, len(values))
	for value := range values {
		items = append(items, value)
	}
	sort.Strings(items)
	return items
}
