package contract

func runAuthCatalog() map[string]map[string]any {
	return map[string]map[string]any{
		"lexicon/app.cerulia.authSessionParticipant.json": permissionSetDoc(
			"app.cerulia.authSessionParticipant",
			"app.cerulia.rpc.getSessionView",
			"app.cerulia.rpc.joinSession",
			"app.cerulia.rpc.leaveSession",
		),
		"lexicon/app.cerulia.authGovernanceOperator.json": permissionSetDoc(
			"app.cerulia.authGovernanceOperator",
			"app.cerulia.rpc.getGovernanceView",
			"app.cerulia.rpc.listSessionPublications",
			"app.cerulia.rpc.createSessionDraft",
			"app.cerulia.rpc.openSession",
			"app.cerulia.rpc.startSession",
			"app.cerulia.rpc.pauseSession",
			"app.cerulia.rpc.resumeSession",
			"app.cerulia.rpc.closeSession",
			"app.cerulia.rpc.archiveSession",
			"app.cerulia.rpc.reopenSession",
			"app.cerulia.rpc.transferAuthority",
			"app.cerulia.rpc.inviteSession",
			"app.cerulia.rpc.cancelInvitation",
			"app.cerulia.rpc.moderateMembership",
		),
		"lexicon/app.cerulia.authPublicationOperator.json": permissionSetDoc(
			"app.cerulia.authPublicationOperator",
			"app.cerulia.rpc.publishSessionLink",
			"app.cerulia.rpc.retireSessionLink",
		),
		"lexicon/app.cerulia.authAppealOriginator.json": permissionSetDoc(
			"app.cerulia.authAppealOriginator",
			"app.cerulia.rpc.listAppealCases",
			"app.cerulia.rpc.submitAppeal",
			"app.cerulia.rpc.withdrawAppeal",
		),
		"lexicon/app.cerulia.authAppealResolver.json": permissionSetDoc(
			"app.cerulia.authAppealResolver",
			"app.cerulia.rpc.listAppealCases",
			"app.cerulia.rpc.submitAppeal",
			"app.cerulia.rpc.withdrawAppeal",
		),
	}
}
