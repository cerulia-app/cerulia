package contract

func defsCatalog() map[string]map[string]any {
	defs := map[string]any{}

	scalarFormats := map[string]string{
		"campaignRef":             "at-uri",
		"governingRef":            "at-uri",
		"sourceCampaignRef":       "at-uri",
		"houseRef":                "at-uri",
		"worldRef":                "at-uri",
		"rulesetManifestRef":      "at-uri",
		"ruleProfileRef":          "at-uri",
		"characterSheetRef":       "at-uri",
		"characterBranchRef":      "at-uri",
		"characterAdvancementRef": "at-uri",
		"characterEpisodeRef":     "at-uri",
		"characterConversionRef":  "at-uri",
		"publicationRef":          "at-uri",
		"reuseGrantRef":           "at-uri",
		"assetRef":                "at-uri",
		"subjectRef":              "at-uri",
		"scopeRef":                "at-uri",
		"targetRef":               "at-uri",
		"sourceRunRef":            "at-uri",
		"sessionRef":              "at-uri",
		"authorityRef":            "at-uri",
		"membershipRef":           "at-uri",
		"sessionPublicationRef":   "at-uri",
		"characterInstanceRef":    "at-uri",
		"characterStateRef":       "at-uri",
		"audienceRef":             "at-uri",
		"gmAudienceRef":           "at-uri",
		"controllerAudienceRef":   "at-uri",
		"audienceGrantRef":        "at-uri",
		"handoutRef":              "at-uri",
		"secretEnvelopeRef":       "at-uri",
		"privateStateEnvelopeRef": "at-uri",
		"revealEventRef":          "at-uri",
		"redactionEventRef":       "at-uri",
		"messageRef":              "at-uri",
		"rollRef":                 "at-uri",
		"sceneRef":                "at-uri",
		"tokenRef":                "at-uri",
		"boardOpRef":              "at-uri",
		"boardSnapshotRef":        "at-uri",
		"appealCaseRef":           "at-uri",
		"appealReviewEntryRef":    "at-uri",
		"detailEnvelopeRef":       "at-uri",
		"rulingEventRef":          "at-uri",
		"targetDid":               "did",
		"did":                     "did",
		"rulesetNsid":             "nsid",
		"datetime":                "datetime",
		"requestId":               "string",
		"cursor":                  "string",
	}
	for name, format := range scalarFormats {
		if format == "string" {
			defs[name] = stringDef("")
			continue
		}
		defs[name] = stringDef(format)
	}

	enums := map[string][]string{
		"visibility":                 {"public", "unlisted", "private"},
		"continuityScopeKind":        {"world", "house", "campaign"},
		"ruleProfileScopeKind":       {"world-shared", "house-shared", "campaign-shared"},
		"ruleProfileStatus":          {"provisional", "active", "retired"},
		"branchKind":                 {"campaign-fork", "imported-fork", "local-override"},
		"conversionAuthorityKind":    {"same-owner", "campaign-steward", "grant-backed"},
		"syncMode":                   {"snapshot", "manual-rebase", "pinned-upstream"},
		"advancementKind":            {"milestone", "xp-spend", "retrain", "respec", "correction", "import-sync"},
		"publicationSubjectKind":     {"campaign", "character-branch", "character-episode"},
		"publicationSurfaceKind":     {"post", "thread", "profile", "app-card"},
		"publicationPurposeKind":     {"discovery", "stable-entry", "archive-link"},
		"publicationStatus":          {"active", "retired"},
		"surfaceStatus":              {"active", "retired"},
		"projectionSurfaceKind":      {"character-home", "campaign-view", "publication-summary"},
		"reusePolicyKind":            {"same-campaign-default", "explicit-cross-campaign", "explicit-cross-scope", "public-library"},
		"reuseTargetKind":            {"campaign", "house", "world", "actor", "public"},
		"reuseMode":                  {"fork-only", "fork-and-advance", "summary-share", "full-share"},
		"sessionState":               {"planning", "open", "active", "paused", "ended", "archived"},
		"authorityHealthKind":        {"healthy", "lease-expired", "controller-missing", "transfer-in-progress", "blocked-appeal"},
		"membershipRole":             {"gm", "player", "viewer", "spectator"},
		"membershipStatus":           {"invited", "joined", "left", "removed", "banned"},
		"audienceKind":               {"role-based", "explicit", "derived"},
		"grantStatus":                {"pending", "active", "revoked"},
		"mutationResultKind":         {"accepted", "rejected", "rebase-needed", "manual-review"},
		"tokenFacetKind":             {"public-facet", "secret-facet-envelope", "controller-dids", "visibility-mode"},
		"selectorPolicyKind":         {"role-members", "explicit-members", "derived-membership"},
		"transferPhase":              {"stable", "preparing", "rotating-grants", "finalizing"},
		"transferPolicyKind":         {"majority-controllers", "unanimous-controllers", "recovery-fallback-majority"},
		"appealTargetKind":           {"ruling-event", "membership"},
		"appealRequestedOutcomeKind": {"supersede-ruling", "restore-membership", "reconsider-membership"},
		"appealStatus":               {"controller-review", "recovery-review", "accepted", "denied", "withdrawn"},
		"appealResolutionKind":       {"accepted", "denied", "withdrawn"},
		"appealBlockedReason":        {"quorum-impossible", "deadline-expired"},
		"appealNextResolverKind":     {"controller-review", "blocked", "recovery-review", "none"},
		"appealReviewPhaseKind":      {"controller-review", "recovery-review"},
		"appealReviewDecisionKind":   {"approve", "deny", "abstain", "withdraw"},
		"sourceType":                 {"player-character", "npc", "preset", "proxy"},
		"redactionMode":              {"hide", "retract", "replace"},
		"revealMode":                 {"broaden-audience", "publish-publicly"},
	}
	for name, values := range enums {
		defs[name] = enumDef(values...)
	}

	defs["surfaceDescriptor"] = objectDef(
		[]string{"surfaceKind", "purposeKind", "surfaceUri", "status"},
		map[string]any{
			"surfaceKind": refDef("app.cerulia.defs#publicationSurfaceKind"),
			"purposeKind": refDef("app.cerulia.defs#publicationPurposeKind"),
			"surfaceUri":  stringDef("uri"),
			"status":      refDef("app.cerulia.defs#surfaceStatus"),
			"retiredAt":   refDef("app.cerulia.defs#datetime"),
		},
	)

	defs["selectorPolicyRoleMembers"] = objectDef(
		[]string{"kind", "roles"},
		map[string]any{
			"kind":               map[string]any{"type": "string", "const": "role-members"},
			"roles":              arrayDefMin(refDef("app.cerulia.defs#membershipRole"), 1),
			"membershipStatuses": arrayDef(refDef("app.cerulia.defs#membershipStatus")),
		},
	)
	defs["selectorPolicyExplicitMembers"] = objectDef(
		[]string{"kind", "actorDids"},
		map[string]any{
			"kind":      map[string]any{"type": "string", "const": "explicit-members"},
			"actorDids": arrayDefMin(refDef("app.cerulia.defs#did"), 1),
		},
	)
	defs["selectorPolicyDerivedMembership"] = objectDef(
		[]string{"kind", "roles", "sessionStates"},
		map[string]any{
			"kind":               map[string]any{"type": "string", "const": "derived-membership"},
			"roles":              arrayDefMin(refDef("app.cerulia.defs#membershipRole"), 1),
			"membershipStatuses": arrayDefMin(refDef("app.cerulia.defs#membershipStatus"), 1),
			"sessionStates":      arrayDefMin(refDef("app.cerulia.defs#sessionState"), 1),
		},
	)
	defs["branchSummary"] = objectDef(
		[]string{"characterBranchRef", "baseSheetRef", "branchLabel", "branchKind", "ownerDid", "revision"},
		map[string]any{
			"characterBranchRef": refDef("app.cerulia.defs#characterBranchRef"),
			"baseSheetRef":       refDef("app.cerulia.defs#characterSheetRef"),
			"branchLabel":        stringDef(""),
			"branchKind":         refDef("app.cerulia.defs#branchKind"),
			"ownerDid":           refDef("app.cerulia.defs#did"),
			"revision":           integerDef(),
		},
	)
	defs["episodeSummary"] = objectDef(
		[]string{"characterEpisodeRef", "characterBranchRef", "outcomeSummary", "createdAt"},
		map[string]any{
			"characterEpisodeRef": refDef("app.cerulia.defs#characterEpisodeRef"),
			"characterBranchRef":  refDef("app.cerulia.defs#characterBranchRef"),
			"campaignRef":         refDef("app.cerulia.defs#campaignRef"),
			"scenarioLabel":       stringDef(""),
			"outcomeSummary":      stringDef(""),
			"createdAt":           refDef("app.cerulia.defs#datetime"),
		},
	)
	defs["conversionSummary"] = objectDef(
		[]string{"characterConversionRef", "sourceSheetRef", "sourceSheetVersion", "targetSheetRef", "targetSheetVersion", "targetBranchRef", "sourceRulesetManifestRef", "targetRulesetManifestRef", "convertedByDid", "authorityKind", "convertedAt"},
		map[string]any{
			"characterConversionRef":   refDef("app.cerulia.defs#characterConversionRef"),
			"sourceSheetRef":           refDef("app.cerulia.defs#characterSheetRef"),
			"sourceSheetVersion":       integerDef(),
			"sourceBranchRef":          refDef("app.cerulia.defs#characterBranchRef"),
			"targetSheetRef":           refDef("app.cerulia.defs#characterSheetRef"),
			"targetSheetVersion":       integerDef(),
			"targetBranchRef":          refDef("app.cerulia.defs#characterBranchRef"),
			"sourceRulesetManifestRef": refDef("app.cerulia.defs#rulesetManifestRef"),
			"targetRulesetManifestRef": refDef("app.cerulia.defs#rulesetManifestRef"),
			"convertedByDid":           refDef("app.cerulia.defs#did"),
			"authorityKind":            refDef("app.cerulia.defs#conversionAuthorityKind"),
			"convertedAt":              refDef("app.cerulia.defs#datetime"),
			"reuseGrantRef":            refDef("app.cerulia.defs#reuseGrantRef"),
		},
	)
	defs["reuseGrantSummary"] = objectDef(
		[]string{"reuseGrantRef", "sourceCampaignRef", "targetKind", "reuseMode", "grantedAt"},
		map[string]any{
			"reuseGrantRef":     refDef("app.cerulia.defs#reuseGrantRef"),
			"sourceCampaignRef": refDef("app.cerulia.defs#sourceCampaignRef"),
			"targetKind":        refDef("app.cerulia.defs#reuseTargetKind"),
			"targetRef":         refDef("app.cerulia.defs#targetRef"),
			"targetDid":         refDef("app.cerulia.defs#targetDid"),
			"reuseMode":         refDef("app.cerulia.defs#reuseMode"),
			"grantedAt":         refDef("app.cerulia.defs#datetime"),
			"expiresAt":         refDef("app.cerulia.defs#datetime"),
			"revokedAt":         refDef("app.cerulia.defs#datetime"),
		},
	)
	defs["publicationSummaryRow"] = objectDef(
		[]string{"publicationRef", "subjectRef", "subjectKind", "entryUrl", "preferredSurfaceKind", "surfaces", "status", "publishedAt"},
		map[string]any{
			"publicationRef":           refDef("app.cerulia.defs#publicationRef"),
			"subjectRef":               refDef("app.cerulia.defs#subjectRef"),
			"subjectKind":              refDef("app.cerulia.defs#publicationSubjectKind"),
			"entryUrl":                 stringDef("uri"),
			"preferredSurfaceKind":     refDef("app.cerulia.defs#publicationSurfaceKind"),
			"surfaces":                 arrayDef(refDef("app.cerulia.defs#surfaceDescriptor")),
			"status":                   refDef("app.cerulia.defs#publicationStatus"),
			"publishedAt":              refDef("app.cerulia.defs#datetime"),
			"retiredAt":                refDef("app.cerulia.defs#datetime"),
			"sourceRulesetManifestRef": refDef("app.cerulia.defs#rulesetManifestRef"),
			"targetRulesetManifestRef": refDef("app.cerulia.defs#rulesetManifestRef"),
			"grantBacked":              booleanDef(),
		},
	)
	defs["campaignSummary"] = objectDef(
		[]string{"campaignRef", "title", "visibility"},
		map[string]any{
			"campaignRef":        refDef("app.cerulia.defs#campaignRef"),
			"title":              stringDef(""),
			"visibility":         refDef("app.cerulia.defs#visibility"),
			"houseRef":           refDef("app.cerulia.defs#houseRef"),
			"worldRef":           refDef("app.cerulia.defs#worldRef"),
			"rulesetNsid":        refDef("app.cerulia.defs#rulesetNsid"),
			"rulesetManifestRef": refDef("app.cerulia.defs#rulesetManifestRef"),
			"archivedAt":         refDef("app.cerulia.defs#datetime"),
		},
	)
	defs["serviceLogRow"] = objectDef(
		[]string{"requestId", "operationNsid", "resultKind", "governingRef", "createdAt", "emittedRecordRefs"},
		map[string]any{
			"requestId":         refDef("app.cerulia.defs#requestId"),
			"operationNsid":     stringDef("nsid"),
			"resultKind":        refDef("app.cerulia.defs#mutationResultKind"),
			"governingRef":      refDef("app.cerulia.defs#governingRef"),
			"actorDid":          refDef("app.cerulia.defs#did"),
			"createdAt":         refDef("app.cerulia.defs#datetime"),
			"emittedRecordRefs": arrayDef(refDef("app.cerulia.defs#subjectRef")),
			"reasonCode":        stringDef(""),
			"message":           stringDef(""),
			"rawPayload":        map[string]any{"type": "unknown"},
		},
	)
	defs["mutationAck"] = objectDef(
		[]string{"requestId", "resultKind"},
		map[string]any{
			"requestId":             refDef("app.cerulia.defs#requestId"),
			"resultKind":            refDef("app.cerulia.defs#mutationResultKind"),
			"emittedRecordRefs":     arrayDef(refDef("app.cerulia.defs#subjectRef")),
			"currentRevision":       integerDef(),
			"currentState":          refDef("app.cerulia.defs#sessionState"),
			"currentVisibility":     refDef("app.cerulia.defs#visibility"),
			"caseRevision":          integerDef(),
			"reviewRevision":        integerDef(),
			"snapshotRef":           refDef("app.cerulia.defs#boardSnapshotRef"),
			"publicationRef":        refDef("app.cerulia.defs#publicationRef"),
			"sessionPublicationRef": refDef("app.cerulia.defs#sessionPublicationRef"),
			"keyVersion":            integerDef(),
			"updatedGrantRefs":      arrayDef(refDef("app.cerulia.defs#audienceGrantRef")),
			"controllerDids":        arrayDef(refDef("app.cerulia.defs#did")),
			"pendingControllerDids": arrayDef(refDef("app.cerulia.defs#did")),
			"leaseHolderDid":        refDef("app.cerulia.defs#did"),
			"transferPhase":         refDef("app.cerulia.defs#transferPhase"),
			"transferCompletedAt":   refDef("app.cerulia.defs#datetime"),
			"message":               stringDef(""),
		},
	)

	return map[string]map[string]any{
		"lexicon/app.cerulia.defs.json": document("app.cerulia.defs", defs),
	}
}
