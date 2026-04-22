import * as AppCeruliaAuthCoreReader from "./generated/types/app/cerulia/authCoreReader.js";
import * as AppCeruliaAuthCoreWriter from "./generated/types/app/cerulia/authCoreWriter.js";

const MAIN_SUFFIX = "#main";

function scopeIdFromMain(main: string): string {
	if (!main.endsWith(MAIN_SUFFIX)) {
		throw new Error(`OAuth scope lexicon must end with ${MAIN_SUFFIX}: ${main}`);
	}

	return main.slice(0, -MAIN_SUFFIX.length);
}

export const AUTH_SCOPE_IDS = {
	reader: scopeIdFromMain(AppCeruliaAuthCoreReader.MAIN),
	writer: scopeIdFromMain(AppCeruliaAuthCoreWriter.MAIN),
} as const;