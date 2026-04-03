package contract

func runRPCCatalog() map[string]map[string]any {
	mutationAck := refDef("app.cerulia.defs#mutationAck")
	commonErrors := []string{"InvalidRequest", "Unauthorized", "Forbidden", "NotFound", "UnsupportedRuleset", "InternalError"}

	return map[string]map[string]any{
		"lexicon/app.cerulia.rpc.getSessionAccessPreflight.json": document("app.cerulia.rpc.getSessionAccessPreflight", map[string]any{
			"main": queryMain([]string{"sessionRef"}, map[string]any{
				"sessionRef": refDef("app.cerulia.defs#sessionRef"),
			}, objectDef([]string{"sessionRef", "decisionKind", "reasonCode", "recommendedRoute"}, map[string]any{
				"sessionRef":            refDef("app.cerulia.defs#sessionRef"),
				"decisionKind":          stringDef(""),
				"reasonCode":            stringDef(""),
				"recommendedRoute":      stringDef(""),
				"authorityRequestId":    refDef("app.cerulia.defs#requestId"),
				"membershipRequestId":   refDef("app.cerulia.defs#requestId"),
				"appealCaseRef":         refDef("app.cerulia.defs#appealCaseRef"),
				"sessionPublicationRef": refDef("app.cerulia.defs#sessionPublicationRef"),
			}), []string{"NotFound"}),
		}),
		"lexicon/app.cerulia.rpc.getSessionView.json": document("app.cerulia.rpc.getSessionView", map[string]any{
			"main": queryMain([]string{"sessionRef"}, map[string]any{
				"sessionRef": refDef("app.cerulia.defs#sessionRef"),
			}, objectDef([]string{"session", "authoritySummary", "memberships", "handoutCount", "appealCount"}, map[string]any{
				"session": participantSessionObject(),
				"authoritySummary": objectDef([]string{"authorityRef", "transferPhase", "authorityHealthKind", "leaseState"}, map[string]any{
					"authorityRef":        refDef("app.cerulia.defs#authorityRef"),
					"transferPhase":       refDef("app.cerulia.defs#transferPhase"),
					"authorityHealthKind": refDef("app.cerulia.defs#authorityHealthKind"),
					"leaseState":          stringDef(""),
					"leaseExpiresAt":      refDef("app.cerulia.defs#datetime"),
				}),
				"memberships":         arrayDef(participantMembershipObject()),
				"activeSceneRef":      refDef("app.cerulia.defs#sceneRef"),
				"handoutCount":        integerDef(),
				"appealCount":         integerDef(),
				"publicationCarriers": arrayDef(sessionPublicationSummaryObject()),
			}), []string{"NotFound"}),
		}),
		"lexicon/app.cerulia.rpc.getGovernanceView.json": document("app.cerulia.rpc.getGovernanceView", map[string]any{
			"main": queryMain([]string{"sessionRef"}, map[string]any{
				"sessionRef": refDef("app.cerulia.defs#sessionRef"),
			}, objectDef([]string{"session", "authority", "memberships"}, map[string]any{
				"session":             governanceSessionObject(),
				"authority":           governanceAuthorityObject(),
				"memberships":         arrayDef(governanceMembershipObject()),
				"activeSceneRef":      refDef("app.cerulia.defs#sceneRef"),
				"publicationCarriers": arrayDef(sessionPublicationSummaryObject()),
				"pendingAppeals": arrayDef(objectDef(nil, map[string]any{
					"appealCaseRef":         refDef("app.cerulia.defs#appealCaseRef"),
					"targetKind":            refDef("app.cerulia.defs#appealTargetKind"),
					"targetRef":             refDef("app.cerulia.defs#targetRef"),
					"requestedOutcomeKind":  refDef("app.cerulia.defs#appealRequestedOutcomeKind"),
					"status":                refDef("app.cerulia.defs#appealStatus"),
					"nextResolverKind":      refDef("app.cerulia.defs#appealNextResolverKind"),
					"openedAt":              refDef("app.cerulia.defs#datetime"),
					"resolvedAt":            refDef("app.cerulia.defs#datetime"),
					"reviewOutcomeSummary":  stringDef(""),
					"controllerReviewDueAt": refDef("app.cerulia.defs#datetime"),
				})),
			}), []string{"NotFound"}),
		}),
		"lexicon/app.cerulia.rpc.createSessionDraft.json": document("app.cerulia.rpc.createSessionDraft", map[string]any{
			"main": procedureMain([]string{"sessionId", "title", "visibility", "rulesetNsid", "rulesetManifestRef", "controllerDids", "recoveryControllerDids", "transferPolicy", "expectedRulesetManifestRef", "requestId"}, map[string]any{
				"sessionId":                  stringDef(""),
				"campaignRef":                refDef("app.cerulia.defs#campaignRef"),
				"title":                      stringDef(""),
				"visibility":                 refDef("app.cerulia.defs#visibility"),
				"rulesetNsid":                refDef("app.cerulia.defs#rulesetNsid"),
				"rulesetManifestRef":         refDef("app.cerulia.defs#rulesetManifestRef"),
				"ruleProfileRefs":            arrayDef(refDef("app.cerulia.defs#ruleProfileRef")),
				"controllerDids":             arrayDefMin(refDef("app.cerulia.defs#did"), 1),
				"recoveryControllerDids":     arrayDefMin(refDef("app.cerulia.defs#did"), 1),
				"transferPolicy":             refDef("app.cerulia.defs#transferPolicyKind"),
				"scheduledAt":                refDef("app.cerulia.defs#datetime"),
				"expectedRulesetManifestRef": refDef("app.cerulia.defs#rulesetManifestRef"),
				"requestId":                  refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.openSession.json":   sessionStateProcedure("app.cerulia.rpc.openSession", "planning"),
		"lexicon/app.cerulia.rpc.startSession.json":  sessionStateProcedure("app.cerulia.rpc.startSession", "open"),
		"lexicon/app.cerulia.rpc.pauseSession.json":  sessionStateProcedure("app.cerulia.rpc.pauseSession", "active"),
		"lexicon/app.cerulia.rpc.resumeSession.json": sessionStateProcedure("app.cerulia.rpc.resumeSession", "paused"),
		"lexicon/app.cerulia.rpc.closeSession.json": document("app.cerulia.rpc.closeSession", map[string]any{
			"main": procedureMain([]string{"sessionRef", "expectedState", "requestId"}, map[string]any{
				"sessionRef":    refDef("app.cerulia.defs#sessionRef"),
				"expectedState": enumDef("open", "active", "paused"),
				"reasonCode":    stringDef(""),
				"requestId":     refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.archiveSession.json": sessionStateProcedure("app.cerulia.rpc.archiveSession", "ended"),
		"lexicon/app.cerulia.rpc.reopenSession.json": document("app.cerulia.rpc.reopenSession", map[string]any{
			"main": procedureMain([]string{"sessionRef", "expectedState", "nextState", "requestId"}, map[string]any{
				"sessionRef":    refDef("app.cerulia.defs#sessionRef"),
				"expectedState": enumDef("ended"),
				"nextState":     enumDef("active", "paused"),
				"reasonCode":    stringDef(""),
				"requestId":     refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.transferAuthority.json": document("app.cerulia.rpc.transferAuthority", map[string]any{
			"main": procedureMain([]string{"sessionRef", "authorityRef", "expectedAuthorityRequestId", "expectedTransferPhase", "expectedControllerDids", "pendingControllerDids", "requestId"}, map[string]any{
				"sessionRef":                 refDef("app.cerulia.defs#sessionRef"),
				"authorityRef":               refDef("app.cerulia.defs#authorityRef"),
				"expectedAuthorityRequestId": refDef("app.cerulia.defs#requestId"),
				"expectedTransferPhase":      refDef("app.cerulia.defs#transferPhase"),
				"expectedControllerDids":     arrayDefMin(refDef("app.cerulia.defs#did"), 1),
				"pendingControllerDids":      arrayDefMin(refDef("app.cerulia.defs#did"), 1),
				"transferPolicy":             refDef("app.cerulia.defs#transferPolicyKind"),
				"leaseHolderDid":             refDef("app.cerulia.defs#did"),
				"reasonCode":                 stringDef(""),
				"requestId":                  refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.inviteSession.json": document("app.cerulia.rpc.inviteSession", map[string]any{
			"main": procedureMain([]string{"sessionRef", "actorDid", "role", "expectedStatus", "requestId"}, map[string]any{
				"sessionRef":     refDef("app.cerulia.defs#sessionRef"),
				"actorDid":       refDef("app.cerulia.defs#did"),
				"role":           refDef("app.cerulia.defs#membershipRole"),
				"expectedStatus": refDef("app.cerulia.defs#membershipStatus"),
				"note":           stringDef(""),
				"requestId":      refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.cancelInvitation.json": document("app.cerulia.rpc.cancelInvitation", map[string]any{
			"main": procedureMain([]string{"sessionRef", "actorDid", "expectedStatus", "reasonCode", "requestId"}, map[string]any{
				"sessionRef":     refDef("app.cerulia.defs#sessionRef"),
				"actorDid":       refDef("app.cerulia.defs#did"),
				"expectedStatus": enumDef("invited"),
				"reasonCode":     stringDef(""),
				"note":           stringDef(""),
				"requestId":      refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.joinSession.json": document("app.cerulia.rpc.joinSession", map[string]any{
			"main": procedureMain([]string{"sessionRef", "actorDid", "expectedStatus", "requestId"}, map[string]any{
				"sessionRef":     refDef("app.cerulia.defs#sessionRef"),
				"actorDid":       refDef("app.cerulia.defs#did"),
				"expectedStatus": enumDef("invited"),
				"requestId":      refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.leaveSession.json": document("app.cerulia.rpc.leaveSession", map[string]any{
			"main": procedureMain([]string{"sessionRef", "actorDid", "expectedStatus", "requestId"}, map[string]any{
				"sessionRef":     refDef("app.cerulia.defs#sessionRef"),
				"actorDid":       refDef("app.cerulia.defs#did"),
				"expectedStatus": enumDef("joined"),
				"reasonCode":     stringDef(""),
				"requestId":      refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
		"lexicon/app.cerulia.rpc.moderateMembership.json": document("app.cerulia.rpc.moderateMembership", map[string]any{
			"main": procedureMain([]string{"sessionRef", "actorDid", "expectedStatus", "nextStatus", "requestId", "reasonCode"}, map[string]any{
				"sessionRef":     refDef("app.cerulia.defs#sessionRef"),
				"actorDid":       refDef("app.cerulia.defs#did"),
				"expectedStatus": refDef("app.cerulia.defs#membershipStatus"),
				"nextStatus":     enumDef("removed", "banned", "joined"),
				"role":           refDef("app.cerulia.defs#membershipRole"),
				"reasonCode":     stringDef(""),
				"note":           stringDef(""),
				"requestId":      refDef("app.cerulia.defs#requestId"),
			}, mutationAck, commonErrors),
		}),
	}
}

func sessionStateProcedure(id string, expectedState string) map[string]any {
	return document(id, map[string]any{
		"main": procedureMain([]string{"sessionRef", "expectedState", "requestId"}, map[string]any{
			"sessionRef":    refDef("app.cerulia.defs#sessionRef"),
			"expectedState": enumDef(expectedState),
			"reasonCode":    stringDef(""),
			"requestId":     refDef("app.cerulia.defs#requestId"),
		}, refDef("app.cerulia.defs#mutationAck"), []string{"InvalidRequest", "Unauthorized", "Forbidden", "NotFound", "UnsupportedRuleset", "InternalError"}),
	})
}

func participantSessionObject() map[string]any {
	return objectDef([]string{"sessionRef", "title", "visibility", "state", "rulesetManifestRef", "ruleProfileRefs"}, map[string]any{
		"sessionRef":           refDef("app.cerulia.defs#sessionRef"),
		"title":                stringDef(""),
		"visibility":           refDef("app.cerulia.defs#visibility"),
		"state":                refDef("app.cerulia.defs#sessionState"),
		"campaignRef":          refDef("app.cerulia.defs#campaignRef"),
		"rulesetManifestRef":   refDef("app.cerulia.defs#rulesetManifestRef"),
		"ruleProfileRefs":      arrayDef(refDef("app.cerulia.defs#ruleProfileRef")),
		"scheduledAt":          refDef("app.cerulia.defs#datetime"),
		"endedAt":              refDef("app.cerulia.defs#datetime"),
		"archivedAt":           refDef("app.cerulia.defs#datetime"),
		"stateChangedAt":       refDef("app.cerulia.defs#datetime"),
		"stateReasonCode":      stringDef(""),
		"visibilityChangedAt":  refDef("app.cerulia.defs#datetime"),
		"visibilityReasonCode": stringDef(""),
	})
}

func governanceSessionObject() map[string]any {
	definition := participantSessionObject()
	definition["properties"].(map[string]any)["stateChangedByDid"] = refDef("app.cerulia.defs#did")
	definition["properties"].(map[string]any)["visibilityChangedByDid"] = refDef("app.cerulia.defs#did")
	return definition
}

func participantMembershipObject() map[string]any {
	return objectDef([]string{"actorDid", "role", "status", "statusChangedAt", "statusChangedByDid"}, map[string]any{
		"actorDid":           refDef("app.cerulia.defs#did"),
		"role":               refDef("app.cerulia.defs#membershipRole"),
		"status":             refDef("app.cerulia.defs#membershipStatus"),
		"statusChangedAt":    refDef("app.cerulia.defs#datetime"),
		"statusChangedByDid": refDef("app.cerulia.defs#did"),
	})
}

func governanceMembershipObject() map[string]any {
	definition := participantMembershipObject()
	definition["properties"].(map[string]any)["statusReasonCode"] = stringDef("")
	return definition
}

func governanceAuthorityObject() map[string]any {
	return objectDef([]string{"authorityRef", "controllerDids", "recoveryControllerDids", "authorityHealthKind", "transferPhase"}, map[string]any{
		"authorityRef":           refDef("app.cerulia.defs#authorityRef"),
		"controllerDids":         arrayDef(refDef("app.cerulia.defs#did")),
		"recoveryControllerDids": arrayDef(refDef("app.cerulia.defs#did")),
		"leaseHolderDid":         refDef("app.cerulia.defs#did"),
		"leaseExpiresAt":         refDef("app.cerulia.defs#datetime"),
		"authorityHealthKind":    refDef("app.cerulia.defs#authorityHealthKind"),
		"transferPhase":          refDef("app.cerulia.defs#transferPhase"),
		"transferStartedAt":      refDef("app.cerulia.defs#datetime"),
		"pendingControllerDids":  arrayDef(refDef("app.cerulia.defs#did")),
		"transferCompletedAt":    refDef("app.cerulia.defs#datetime"),
	})
}

func sessionPublicationSummaryObject() map[string]any {
	return objectDef([]string{"sessionPublicationRef", "publicationRef", "entryUrl", "preferredSurfaceKind"}, map[string]any{
		"sessionPublicationRef": refDef("app.cerulia.defs#sessionPublicationRef"),
		"publicationRef":        refDef("app.cerulia.defs#publicationRef"),
		"entryUrl":              stringDef("uri"),
		"replayUrl":             stringDef("uri"),
		"preferredSurfaceKind":  refDef("app.cerulia.defs#publicationSurfaceKind"),
		"surfaces":              arrayDef(refDef("app.cerulia.defs#surfaceDescriptor")),
		"retiredAt":             refDef("app.cerulia.defs#datetime"),
		"retireReasonCode":      stringDef(""),
		"updatedAt":             refDef("app.cerulia.defs#datetime"),
		"publishedByDid":        refDef("app.cerulia.defs#did"),
		"updatedByDid":          refDef("app.cerulia.defs#did"),
	})
}
