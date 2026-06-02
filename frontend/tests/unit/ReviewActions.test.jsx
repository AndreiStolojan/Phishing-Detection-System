import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ReviewActions from '../../src/components/security/ReviewActions.jsx';

describe('ReviewActions', () => {
  it('calls security action handlers', async () => {
    const onRescan = vi.fn();
    const onMarkSafe = vi.fn();
    const onMarkPhishing = vi.fn();

    render(
      <ReviewActions
        onRescan={onRescan}
        onMarkSafe={onMarkSafe}
        onMarkPhishing={onMarkPhishing}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Rescan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark safe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark phishing' }));

    expect(onRescan).toHaveBeenCalledTimes(1);
    expect(onMarkSafe).toHaveBeenCalledTimes(1);
    expect(onMarkPhishing).toHaveBeenCalledTimes(1);
  });

  it('disables actions while loading', () => {
    render(<ReviewActions loading onRescan={vi.fn()} onMarkSafe={vi.fn()} onMarkPhishing={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Rescan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark safe' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark phishing' })).toBeDisabled();
  });
});
