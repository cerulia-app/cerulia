package contract

func authCatalog() map[string]map[string]any {
	return map[string]map[string]any{
		"lexicon/app.cerulia.authCoreReader.json": permissionSetDoc(
			"app.cerulia.authCoreReader",
			"app.cerulia.rpc.getCharacterHome",
			"app.cerulia.rpc.listCharacterBranches",
			"app.cerulia.rpc.getCharacterBranchView",
			"app.cerulia.rpc.getCampaignView",
			"app.cerulia.rpc.listCampaigns",
			"app.cerulia.rpc.listCharacterEpisodes",
			"app.cerulia.rpc.listReuseGrants",
			"app.cerulia.rpc.listPublications",
			"app.cerulia.rpc.listPublicationLibrary",
			"app.cerulia.rpc.getPublicationView",
		),
		"lexicon/app.cerulia.authCoreWriter.json": permissionSetDoc(
			"app.cerulia.authCoreWriter",
			"app.cerulia.rpc.createCampaign",
			"app.cerulia.rpc.attachRuleProfile",
			"app.cerulia.rpc.retireRuleProfile",
			"app.cerulia.rpc.importCharacterSheet",
			"app.cerulia.rpc.createCharacterBranch",
			"app.cerulia.rpc.updateCharacterBranch",
			"app.cerulia.rpc.retireCharacterBranch",
			"app.cerulia.rpc.recordCharacterAdvancement",
			"app.cerulia.rpc.recordCharacterEpisode",
			"app.cerulia.rpc.recordCharacterConversion",
		),
		"lexicon/app.cerulia.authCorePublicationOperator.json": permissionSetDoc(
			"app.cerulia.authCorePublicationOperator",
			"app.cerulia.rpc.publishSubject",
			"app.cerulia.rpc.retirePublication",
		),
		"lexicon/app.cerulia.authReuseOperator.json": permissionSetDoc(
			"app.cerulia.authReuseOperator",
			"app.cerulia.rpc.grantReuse",
			"app.cerulia.rpc.revokeReuse",
		),
	}
}
