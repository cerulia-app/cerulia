import type { SupportedLocale, TextDirection } from '$lib/i18n/locale';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			appLocale: SupportedLocale;
			ceruliaViewerAuth: {
				did: string;
				scopes: string[];
			} | null;
			htmlLang: string;
			textDirection: TextDirection;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
