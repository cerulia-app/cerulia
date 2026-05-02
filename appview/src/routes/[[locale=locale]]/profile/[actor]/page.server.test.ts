import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockRequestCeruliaJson } = vi.hoisted(() => ({
	mockRequestCeruliaJson: vi.fn()
}));

vi.mock('$lib/server/cerulia-http', () => ({
	requestCeruliaJson: mockRequestCeruliaJson
}));

import { load } from './+page.server';

describe('profile page server load', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('throws route not found when actor root is missing', async () => {
		mockRequestCeruliaJson.mockResolvedValue({
			status: 404,
			ok: false
		});

		await expect(
			load({
				params: { actor: 'did:plc:testactor' },
				url: new URL('https://app.cerulia.example.com/profile/did%3Aplc%3Atestactor'),
				locals: {}
			} as never)
		).rejects.toMatchObject({ status: 404 });
	});
});
