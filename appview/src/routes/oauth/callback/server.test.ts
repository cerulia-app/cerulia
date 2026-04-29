import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
	mockGetCeruliaOauthRuntime,
	mockMirrorOauthSessionToApi,
	mockDeleteMirroredOauthSessionFromApi
} = vi.hoisted(() => ({
	mockGetCeruliaOauthRuntime: vi.fn(),
	mockMirrorOauthSessionToApi: vi.fn(),
	mockDeleteMirroredOauthSessionFromApi: vi.fn()
}));

vi.mock('$lib/server/oauth-runtime', () => ({
	getCeruliaOauthRuntime: mockGetCeruliaOauthRuntime
}));

vi.mock('$lib/server/cerulia-oauth-mirror', () => ({
	mirrorOauthSessionToApi: mockMirrorOauthSessionToApi,
	deleteMirroredOauthSessionFromApi: mockDeleteMirroredOauthSessionFromApi
}));

import { GET } from './+server';

describe('oauth callback route', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('aggregates callback compensation failures after browser session commit fails', async () => {
		const savedSession = {
			authMethod: 'oauth',
			tokenSet: { scope: 'atproto transition:generic' },
			refreshJwt: 'refresh-token',
			dpopJwk: { kty: 'EC' }
		} as never;
		const commitError = new Error('browser session commit failed');
		const mirrorDeleteError = new Error('mirror delete failed');
		const rollbackError = new Error('rollback failed');
		const finishLogin = vi.fn().mockResolvedValue({
			did: 'did:plc:e2e-oauth',
			grantedScope: 'atproto transition:generic',
			returnTo: '/oauth/session',
			savedSession
		});
		const commitBrowserSession = vi.fn().mockRejectedValue(commitError);
		const rollbackLogin = vi.fn().mockRejectedValue(rollbackError);

		mockGetCeruliaOauthRuntime.mockResolvedValue({
			finishLogin,
			commitBrowserSession,
			rollbackLogin
		} as never);
		mockMirrorOauthSessionToApi.mockResolvedValue(undefined);
		mockDeleteMirroredOauthSessionFromApi.mockRejectedValue(mirrorDeleteError);

		const cookies = {
			set: vi.fn()
		};
		const callbackUrl = new URL('https://app.cerulia.example.com/oauth/callback?code=test');
		let thrown: unknown;
		try {
			await GET({
				cookies,
				url: callbackUrl
			} as never);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(AggregateError);
		expect((thrown as AggregateError).message).toBe('OAuth callback compensation failed');
		expect((thrown as AggregateError).errors).toEqual([
			commitError,
			mirrorDeleteError,
			rollbackError
		]);
		expect(cookies.set).not.toHaveBeenCalled();
		expect(finishLogin).toHaveBeenCalledWith(callbackUrl.searchParams);
		expect(mockMirrorOauthSessionToApi).toHaveBeenCalledWith({
			did: 'did:plc:e2e-oauth',
			grantedScope: 'atproto transition:generic',
			savedSession
		});
		expect(commitBrowserSession).toHaveBeenCalledWith(
			'did:plc:e2e-oauth',
			'atproto transition:generic'
		);
		expect(mockDeleteMirroredOauthSessionFromApi).toHaveBeenCalledWith({
			did: 'did:plc:e2e-oauth',
			grantedScope: 'atproto transition:generic'
		});
		expect(rollbackLogin).toHaveBeenCalledWith('did:plc:e2e-oauth');
	});
});
