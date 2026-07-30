import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { PostureGauge } from '../../src/components/dashboard/PostureGauge.jsx';
import { getHealthColor, getHealthTextColor } from '../../src/lib/scoreScale.js';

const arcOf = (container) => container.querySelectorAll('circle')[1];

describe('PostureGauge', () => {
  // The bug this guards: the arc used to be painted with the "safe" category
  // colour, so a 12% safe rate looked exactly as green as a 98% one.
  it('paints the arc and the numeral from the health ramp, not a fixed colour', () => {
    const healthy = render(<PostureGauge value={96} />);
    const poor = render(<PostureGauge value={18} />);

    expect(arcOf(healthy.container).getAttribute('stroke')).toBe(getHealthColor(96));
    expect(arcOf(poor.container).getAttribute('stroke')).toBe(getHealthColor(18));
    expect(arcOf(healthy.container).getAttribute('stroke')).not.toBe(
      arcOf(poor.container).getAttribute('stroke')
    );

    expect(healthy.container.querySelector('text').getAttribute('fill')).toBe(
      getHealthTextColor(96)
    );
    expect(poor.container.querySelector('text').getAttribute('fill')).toBe(getHealthTextColor(18));
  });

  it('maps the value onto the 270° arc', () => {
    const { container } = render(<PostureGauge value={40} />);
    // 40% of the 75-unit arc (pathLength=100, 25 units are the gap at the bottom).
    expect(arcOf(container).getAttribute('stroke-dasharray')).toBe('30 70');
  });

  it('clamps junk values instead of rendering NaN', () => {
    const { container } = render(<PostureGauge value={undefined} />);
    expect(arcOf(container).getAttribute('stroke-dasharray')).toBe('0 100');
    expect(container.querySelector('svg').getAttribute('aria-label')).toContain('0 percent');
  });

  it('labels itself with the value and the plain-language conclusion', () => {
    const { container } = render(<PostureGauge value={96} />);
    expect(container.querySelector('svg').getAttribute('aria-label')).toBe(
      'Safe rate 96 percent. Your inbox is clean.'
    );
  });
});
