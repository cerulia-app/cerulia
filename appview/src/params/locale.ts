import { isSupportedLocale } from '$lib/i18n/locale';

export function match(param: string): boolean {
	return isSupportedLocale(param);
}
