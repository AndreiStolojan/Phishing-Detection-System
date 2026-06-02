import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../src/api/apiClient.js';
import { setStoredToken } from '../../src/utils/tokenStorage.js';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('apiClient', () => {
  it('sends bearer token from storage', async () => {
    setStoredToken('jwt-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true, data: { ok: true } })),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.get('/users/me');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-token',
        }),
      })
    );
  });

  it('throws normalized backend errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              success: false,
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
            })
          ),
      })
    );

    await expect(apiClient.get('/emails')).rejects.toMatchObject({
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });
});
