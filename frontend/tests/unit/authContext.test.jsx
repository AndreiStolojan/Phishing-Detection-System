import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, AuthProvider } from '../../src/context/AuthContext.jsx';

vi.mock('../../src/api/authApi.js', () => ({
  login: vi.fn().mockResolvedValue({
    token: 'new-token',
    user: {
      _id: 'u1',
      name: 'Test User',
      email: 'test@example.com',
      settings: { aiEnabled: true },
    },
  }),
  register: vi.fn(),
}));

vi.mock('../../src/api/usersApi.js', () => ({
  getMe: vi.fn().mockResolvedValue({
    _id: 'u1',
    name: 'Stored User',
    email: 'stored@example.com',
    settings: { aiEnabled: true },
  }),
}));

afterEach(() => {
  window.localStorage.clear();
});

function Consumer() {
  return (
    <AuthContext.Consumer>
      {(auth) => (
        <div>
          <span data-testid="auth-state">{auth.isAuthenticated ? 'yes' : 'no'}</span>
          <span data-testid="user-name">{auth.user?.name || 'none'}</span>
          <button type="button" onClick={() => auth.login({ email: 'test@example.com', password: 'Password1!' })}>
            Login
          </button>
          <button type="button" onClick={auth.logout}>
            Logout
          </button>
        </div>
      )}
    </AuthContext.Consumer>
  );
}

describe('AuthProvider', () => {
  it('stores token and exposes user after login', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('yes'));
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    expect(window.localStorage.getItem('secureinbox_token')).toBe('new-token');
  });

  it('clears local auth state on logout', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('no'));
    expect(window.localStorage.getItem('secureinbox_token')).toBeNull();
  });
});
