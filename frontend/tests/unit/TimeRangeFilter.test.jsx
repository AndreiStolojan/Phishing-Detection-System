import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TimeRangeProvider } from '../../src/context/TimeRangeContext.jsx';
import { TimeRangeFilter } from '../../src/components/common/TimeRangeFilter.jsx';

// Smoke test: the dashboard mounts this on load, so a render-time throw here
// blanks the whole page. Mounting it must not crash and must expose the two
// From/To date inputs seeded with the default (last 30 days) window.
describe('TimeRangeFilter', () => {
  it('renders From and To date inputs with from <= to', () => {
    render(
      <TimeRangeProvider>
        <TimeRangeFilter />
      </TimeRangeProvider>
    );

    const from = screen.getByLabelText('From');
    const to = screen.getByLabelText('To');

    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    expect(from.value <= to.value).toBe(true);
  });
});
