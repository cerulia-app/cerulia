import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockRequestCeruliaJson } = vi.hoisted(() => ({
	mockRequestCeruliaJson: vi.fn()
}));

vi.mock('$lib/server/cerulia-http', () => ({
	requestCeruliaJson: mockRequestCeruliaJson
}));

import { load } from './+page.server';

describe('character detail page server load', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('throws route not found when branch root is missing', async () => {
		mockRequestCeruliaJson.mockResolvedValue({
			status: 404,
			ok: false
		});

		await expect(
			load({
				params: { branch: 'at://did:plc:test/app.cerulia.character.branch/alpha' },
				url: new URL('https://app.cerulia.example.com/characters/test-branch'),
				locals: {}
			} as never)
		).rejects.toMatchObject({ status: 404 });
	});
});
