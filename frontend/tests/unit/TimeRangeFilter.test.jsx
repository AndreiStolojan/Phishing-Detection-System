import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TimeRangeProvider } from '../../src/context/TimeRangeContext.jsx';
import { TimeRangeFilter } from '../../src/components/common/TimeRangeFilter.jsx';

describe('TimeRangeFilter', () => {
  it('opens the range picker and exposes its custom calendar controls', async () => {
    const user = userEvent.setup();
    render(
      <TimeRangeProvider>
        <TimeRangeFilter />
      </TimeRangeProvider>
    );

    await user.click(screen.getByRole('button', { name: /last 30 days/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Custom range' }));

    expect(screen.getAllByLabelText('Month')).toHaveLength(2);
    expect(screen.getAllByLabelText('Year')).toHaveLength(2);
  });
});
