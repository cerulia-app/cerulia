package contract

func rpcCatalog() map[string]map[string]any {
	mutationAck := refDef("app.cerulia.defs#mutationAck")
	commonErrors := []string{"InvalidRequest", "Unauthorized", "Forbidden", "NotFound", "UnsupportedRuleset", "InternalError"}

	return map[string]map[string]any{
		"lexicon/app.cerulia.rpc.getCharacterHome.json": document("app.cerulia.rpc.getCharacterHome", map[string]any{
			"main": queryMain(nil, map[string]any{
				"ownerDid": refDef("app.cerulia.defs#did"),
			}, objectDef([]string{"ownerDid", "primaryBranch", "branches", "recentEpisodes", "reuseGrants", "publications"}, map[string]any{
				"ownerDid":              refDef("app.cerulia.defs#did"),
				"primaryBranch":         refDef("app.cerulia.defs#branchSummary"),
				"branches":              arrayDef(refDef("app.cerulia.defs#branchSummary")),
				"recentEpisodes":        arrayDef(refDef("app.cerulia.defs#episodeSummary")),
				"recentConversions":     arrayDef(refDef("app.cerulia.defs#conversionSummary")),
				"reuseGrants":           arrayDef(refDef("app.cerulia.defs#reuseGrantSummary")),
				"publications":          arrayDef(refDef("app.cerulia.defs#publicationSummaryRow")),
				"linkedCampaigns":       arrayDef(refDef("app.cerulia.defs#campaignSummary")),
				"recentAdvancementRefs": arrayDef(refDef("app.cerulia.defs#characterAdvancementRef")),
			}), []string{"InvalidRequest", "Unauthorized", "Forbidden"}),
		}),
		"lexicon/app.cerulia.rpc.getCampaignView.json": document("app.cerulia.rpc.getCampaignView", map[string]any{
			"main": queryMain([]string{"campaignRef"}, map[string]any{
				"campaignRef": refDef("app.cerulia.defs#campaignRef"),
				"mode":        enumDef("owner-steward", "public"),
			}, objectDef([]string{"mode", "campaign", "publishedArtifacts"}, map[string]any{
				"mode":     enumDef("owner-steward", "public"),
				"campaign": refDef("app.cerulia.defs#campaignSummary"),
				"ruleProvenance": objectDef(nil, map[string]any{
					"sharedRuleProfileRefs": arrayDef(refDef("app.cerulia.defs#ruleProfileRef")),
					"rulesetManifestRef":    refDef("app.cerulia.defs#rulesetManifestRef"),
				}),
				"defaultReusePolicy": refDef("app.cerulia.defs#reusePolicyKind"),
				"publishedArtifacts": arrayDef(refDef("app.cerulia.defs#publicationSummaryRow")),
				"recentContinuity":   arrayDef(refDef("app.cerulia.defs#episodeSummary")),
				"activeBranches":     arrayDef(refDef("app.cerulia.defs#branchSummary")),
				"stewardDids":        arrayDef(refDef("app.cerulia.defs#did")),
				"archivedCounts": objectDef(nil, map[string]any{
					"episodes":     integerDef(),
					"publications": integerDef(),
				}),
			}), []string{"InvalidRequest", "Unauthorized", "Forbidden", "NotFound"}),
		}),
		"lexicon/app.cerulia.rpc.listCharacterEpisodes.json": document("app.cerulia.rpc.listCharacterEpisodes", map[string]any{
			"main": queryMain([]string{"characterBranchRef"}, map[string]any{
				"characterBranchRef": refDef("app.cerulia.defs#characterBranchRef"),
				"limit":              integerDef(),
				"cursor":             refDef("app.cerulia.defs#cursor"),
			}, objectDef([]string{"items"}, map[string]any{
				"items":  arrayDef(refDef("app.cerulia.defs#episodeSummary")),
				"cursor": refDef("app.cerulia.defs#cursor"),
			}), []string{"InvalidRequest", "Unauthorized", "Forbidden", "NotFound"}),
		}),
		"lexicon/app.cerulia.rpc.listReuseGrants.json": document("app.cerulia.rpc.listReuseGrants", map[string]any{
			"main": queryMain([]string{"characterBranchRef"}, map[string]any{
				"characterBranchRef": refDef("app.cerulia.defs#characterBranchRef"),
				"state":              enumDef("active", "revoked", "expired", "all"),
				"limit":              integerDef(),
				"cursor":             refDef("app.cerulia.defs#cursor"),
			}, objectDef([]string{"items"}, map[string]any{
				"items":  arrayDef(refDef("app.cerulia.defs#reuseGrantSummary")),
				"cursor": refDef("app.cerulia.defs#cursor"),
			}), []string{"InvalidRequest", "Unauthorized", "Forbidden", "NotFound"}),
		}),
		"lexicon/app.cerulia.rpc.listPublications.json": document("app.cerulia.rpc.listPublications", map[string]any{
			"main": queryMain(nil, map[string]any{
				"subjectRef":     refDef("app.cerulia.defs#subjectRef"),
				"subjectKind":    refDef("app.cerulia.defs#publicationSubjectKind"),
				"mode":           enumDef("owner-steward", "public"),
				"includeRetired": booleanDef(),
				"limit":          integerDef(),
				"cursor":         refDef("app.cerulia.defs#cursor"),
			}, objectDef([]string{"items"}, map[string]any{
				"items":  arrayDef(refDef("app.cerulia.defs#publicationSummaryRow")),
				"cursor": refDef("app.cerulia.defs#cursor"),
			}), []string{"InvalidRequest", "Unauthorized", "Forbidden", "NotFound"}),
		}),
		"lexicon/app.cerulia.rpc.createCampaign.json": document("app.cerulia.rpc.createCampaign", map[string]any{
			"main": procedureMain([]string{"title", "visibility", "rulesetNsid", "rulesetManifestRef", "defaultReusePolicyKind", "stewardDids", "requestId"}, map[string]any{
				"title":                  stringDef(""),
				"visibility":             refDef("app.cerulia.defs#visibility"),
				"houseRef":               refDef("app.cerulia.defs#houseRef"),
				"worldRef":               refDef("app.cerulia.defs#worldRef"),
				"rulesetNsid":            refDef("app.cerulia.defs#rulesetNsid"),
				"rulesetManifestRef":     refDef("app.cerulia.defs#rulesetManifestRef"),
				"sharedRuleProfileRefs":  arrayDef(refDef("app.cerulia.defs#ruleProfileRef")),
				"defaultReusePolicyKind": refDef("app.cerulia.defs#reusePolicyKind"),
				"stewardDids":            arrayDefMin(refDef("app.cerulia.defs#did"), 1),
				"requestId":              refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.importCharacterSheet.json": document("app.cerulia.rpc.importCharacterSheet", map[string]any{
			"main": procedureMain([]string{"ownerDid", "rulesetNsid", "displayName", "requestId"}, map[string]any{
				"ownerDid":         refDef("app.cerulia.defs#did"),
				"rulesetNsid":      refDef("app.cerulia.defs#rulesetNsid"),
				"displayName":      stringDef(""),
				"portraitRef":      refDef("app.cerulia.defs#assetRef"),
				"publicProfile":    map[string]any{"type": "unknown"},
				"stats":            map[string]any{"type": "unknown"},
				"externalSheetUri": stringDef("uri"),
				"requestId":        refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.createCharacterBranch.json": document("app.cerulia.rpc.createCharacterBranch", map[string]any{
			"main": procedureMain([]string{"ownerDid", "baseSheetRef", "branchKind", "branchLabel", "requestId"}, map[string]any{
				"ownerDid":           refDef("app.cerulia.defs#did"),
				"baseSheetRef":       refDef("app.cerulia.defs#characterSheetRef"),
				"branchKind":         refDef("app.cerulia.defs#branchKind"),
				"branchLabel":        stringDef(""),
				"overridePayloadRef": stringDef("uri"),
				"importedFrom":       stringDef("uri"),
				"sourceRevision":     integerDef(),
				"syncMode":           refDef("app.cerulia.defs#syncMode"),
				"requestId":          refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.updateCharacterBranch.json": document("app.cerulia.rpc.updateCharacterBranch", map[string]any{
			"main": procedureMain([]string{"characterBranchRef", "expectedRevision", "requestId"}, map[string]any{
				"characterBranchRef": refDef("app.cerulia.defs#characterBranchRef"),
				"expectedRevision":   integerDef(),
				"branchLabel":        stringDef(""),
				"overridePayloadRef": stringDef("uri"),
				"importedFrom":       stringDef("uri"),
				"sourceRevision":     integerDef(),
				"syncMode":           refDef("app.cerulia.defs#syncMode"),
				"requestId":          refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.retireCharacterBranch.json": document("app.cerulia.rpc.retireCharacterBranch", map[string]any{
			"main": procedureMain([]string{"characterBranchRef", "expectedRevision", "requestId"}, map[string]any{
				"characterBranchRef": refDef("app.cerulia.defs#characterBranchRef"),
				"expectedRevision":   integerDef(),
				"reasonCode":         stringDef(""),
				"requestId":          refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.recordCharacterAdvancement.json": document("app.cerulia.rpc.recordCharacterAdvancement", map[string]any{
			"main": procedureMain([]string{"characterBranchRef", "advancementKind", "deltaPayloadRef", "approvedByDid", "effectiveAt", "requestId"}, map[string]any{
				"characterBranchRef": refDef("app.cerulia.defs#characterBranchRef"),
				"advancementKind":    refDef("app.cerulia.defs#advancementKind"),
				"deltaPayloadRef":    stringDef("uri"),
				"approvedByDid":      refDef("app.cerulia.defs#did"),
				"effectiveAt":        refDef("app.cerulia.defs#datetime"),
				"supersedesRef":      refDef("app.cerulia.defs#characterAdvancementRef"),
				"note":               stringDef(""),
				"requestId":          refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.recordCharacterEpisode.json": document("app.cerulia.rpc.recordCharacterEpisode", map[string]any{
			"main": procedureMain([]string{"characterBranchRef", "rulesetManifestRef", "effectiveRuleProfileRefs", "outcomeSummary", "advancementRefs", "recordedByDid", "requestId"}, map[string]any{
				"characterBranchRef":       refDef("app.cerulia.defs#characterBranchRef"),
				"campaignRef":              refDef("app.cerulia.defs#campaignRef"),
				"scenarioLabel":            stringDef(""),
				"rulesetManifestRef":       refDef("app.cerulia.defs#rulesetManifestRef"),
				"effectiveRuleProfileRefs": arrayDef(refDef("app.cerulia.defs#ruleProfileRef")),
				"outcomeSummary":           stringDef(""),
				"advancementRefs":          arrayDef(refDef("app.cerulia.defs#characterAdvancementRef")),
				"supersedesRef":            refDef("app.cerulia.defs#characterEpisodeRef"),
				"recordedByDid":            refDef("app.cerulia.defs#did"),
				"requestId":                refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.recordCharacterConversion.json": document("app.cerulia.rpc.recordCharacterConversion", map[string]any{
			"main": procedureMain([]string{"sourceSheetRef", "sourceSheetVersion", "sourceRulesetManifestRef", "sourceEffectiveRuleProfileRefs", "targetSheetRef", "targetSheetVersion", "targetBranchRef", "targetRulesetManifestRef", "targetEffectiveRuleProfileRefs", "conversionContractRef", "conversionContractVersion", "convertedByDid", "convertedAt", "requestId"}, map[string]any{
				"sourceSheetRef":                 refDef("app.cerulia.defs#characterSheetRef"),
				"sourceSheetVersion":             integerDef(),
				"sourceBranchRef":                refDef("app.cerulia.defs#characterBranchRef"),
				"sourceEpisodeRefs":              arrayDef(refDef("app.cerulia.defs#characterEpisodeRef")),
				"sourceRulesetManifestRef":       refDef("app.cerulia.defs#rulesetManifestRef"),
				"sourceEffectiveRuleProfileRefs": arrayDef(refDef("app.cerulia.defs#ruleProfileRef")),
				"targetSheetRef":                 refDef("app.cerulia.defs#characterSheetRef"),
				"targetSheetVersion":             integerDef(),
				"targetBranchRef":                refDef("app.cerulia.defs#characterBranchRef"),
				"targetCampaignRef":              refDef("app.cerulia.defs#campaignRef"),
				"targetRulesetManifestRef":       refDef("app.cerulia.defs#rulesetManifestRef"),
				"targetEffectiveRuleProfileRefs": arrayDef(refDef("app.cerulia.defs#ruleProfileRef")),
				"conversionContractRef":          stringDef("uri"),
				"conversionContractVersion":      integerDef(),
				"reuseGrantRef":                  refDef("app.cerulia.defs#reuseGrantRef"),
				"convertedByDid":                 refDef("app.cerulia.defs#did"),
				"convertedAt":                    refDef("app.cerulia.defs#datetime"),
				"supersedesRef":                  refDef("app.cerulia.defs#characterConversionRef"),
				"note":                           stringDef(""),
				"requestId":                      refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.attachRuleProfile.json": document("app.cerulia.rpc.attachRuleProfile", map[string]any{
			"main": procedureMain([]string{"campaignRef", "ruleProfileRef", "expectedCampaignRevision", "expectedRulesetManifestRef", "requestId"}, map[string]any{
				"campaignRef":                refDef("app.cerulia.defs#campaignRef"),
				"ruleProfileRef":             refDef("app.cerulia.defs#ruleProfileRef"),
				"expectedCampaignRevision":   integerDef(),
				"expectedRulesetManifestRef": refDef("app.cerulia.defs#rulesetManifestRef"),
				"requestId":                  refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.retireRuleProfile.json": document("app.cerulia.rpc.retireRuleProfile", map[string]any{
			"main": procedureMain([]string{"ruleProfileRef", "scopeKind", "scopeRef", "expectedRulesetManifestRef", "requestId"}, map[string]any{
				"ruleProfileRef":             refDef("app.cerulia.defs#ruleProfileRef"),
				"scopeKind":                  refDef("app.cerulia.defs#ruleProfileScopeKind"),
				"scopeRef":                   refDef("app.cerulia.defs#scopeRef"),
				"expectedRulesetManifestRef": refDef("app.cerulia.defs#rulesetManifestRef"),
				"campaignRef":                refDef("app.cerulia.defs#campaignRef"),
				"expectedCampaignRevision":   integerDef(),
				"requestId":                  refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.publishSubject.json": document("app.cerulia.rpc.publishSubject", map[string]any{
			"main": procedureMain([]string{"subjectRef", "subjectKind", "entryUrl", "preferredSurfaceKind", "surfaces", "requestId"}, map[string]any{
				"subjectRef":             refDef("app.cerulia.defs#subjectRef"),
				"subjectKind":            refDef("app.cerulia.defs#publicationSubjectKind"),
				"entryUrl":               stringDef("uri"),
				"preferredSurfaceKind":   refDef("app.cerulia.defs#publicationSurfaceKind"),
				"surfaces":               arrayDefMin(refDef("app.cerulia.defs#surfaceDescriptor"), 1),
				"reuseGrantRef":          refDef("app.cerulia.defs#reuseGrantRef"),
				"expectedCurrentHeadRef": refDef("app.cerulia.defs#publicationRef"),
				"note":                   stringDef(""),
				"requestId":              refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.retirePublication.json": document("app.cerulia.rpc.retirePublication", map[string]any{
			"main": procedureMain([]string{"publicationRef", "requestId"}, map[string]any{
				"publicationRef": refDef("app.cerulia.defs#publicationRef"),
				"note":           stringDef(""),
				"requestId":      refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.grantReuse.json": document("app.cerulia.rpc.grantReuse", map[string]any{
			"main": procedureMain([]string{"characterBranchRef", "sourceCampaignRef", "targetKind", "reuseMode", "requestId"}, map[string]any{
				"characterBranchRef": refDef("app.cerulia.defs#characterBranchRef"),
				"sourceCampaignRef":  refDef("app.cerulia.defs#sourceCampaignRef"),
				"targetKind":         refDef("app.cerulia.defs#reuseTargetKind"),
				"targetRef":          refDef("app.cerulia.defs#targetRef"),
				"targetDid":          refDef("app.cerulia.defs#targetDid"),
				"reuseMode":          refDef("app.cerulia.defs#reuseMode"),
				"expiresAt":          refDef("app.cerulia.defs#datetime"),
				"note":               stringDef(""),
				"requestId":          refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.revokeReuse.json": document("app.cerulia.rpc.revokeReuse", map[string]any{
			"main": procedureMain([]string{"reuseGrantRef", "revokeReasonCode", "requestId"}, map[string]any{
				"reuseGrantRef":    refDef("app.cerulia.defs#reuseGrantRef"),
				"revokeReasonCode": stringDef(""),
				"note":             stringDef(""),
				"requestId":        refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
	}
}
