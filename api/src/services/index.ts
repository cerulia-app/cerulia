import { createActorService } from "./actor.js";
import { createCampaignService } from "./campaign.js";
import { createCharacterService } from "./character.js";
import { createHouseService } from "./house.js";
import { createRuleService } from "./rule.js";
import { createScenarioService } from "./scenario.js";
import { createSessionService } from "./session.js";
import { createServiceRuntime } from "./runtime.js";
import type { AtomicRecordStore } from "../store/types.js";

export function createServices(store: AtomicRecordStore) {
	const runtime = createServiceRuntime(store);

	return {
		actor: createActorService(runtime),
		campaign: createCampaignService(runtime),
		character: createCharacterService(runtime),
		house: createHouseService(runtime),
		rule: createRuleService(runtime),
		scenario: createScenarioService(runtime),
		session: createSessionService(runtime),
	};
}
