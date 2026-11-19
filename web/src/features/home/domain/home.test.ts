import { describe, expect, it } from 'vitest';

import {
  buildBarChart,
  firstName,
  greetingFor,
  mixPercent,
  sortAlerts,
  type HomeAlert,
} from './home';

describe('greetingFor and firstName (RF-DSH-01)', () => {
  it('greets by the time of day', () => {
    expect([greetingFor(8), greetingFor(12), greetingFor(18), greetingFor(19)]).toEqual([
      'morning',
      'afternoon',
      'afternoon',
      'evening',
    ]);
  });

  it('uses the first name', () => {
    expect(firstName('  Ximena Ledezma ')).toBe('Ximena');
  });
});

describe('sortAlerts (F7-T03)', () => {
  const alert = (overrides: Partial<HomeAlert>): HomeAlert => ({
    kind: 'low_stock',
    severity: 'attention',
    entity: 'product',
    entityId: 'p',
    title: 'B',
    folio: null,
    amount: 1,
    dueDate: null,
    ...overrides,
  });

  it('puts urgent alerts first, then the soonest date', () => {
    const sorted = sortAlerts([
      alert({ title: 'low' }),
      alert({ title: 'upcoming', kind: 'upcoming_installment', dueDate: '2026-11-22' }),
      alert({ title: 'out', kind: 'out_of_stock', severity: 'urgent' }),
      alert({
        title: 'overdue',
        kind: 'overdue_installment',
        severity: 'urgent',
        dueDate: '2026-11-05',
      }),
    ]);
    expect(sorted.map((a) => a.title)).toEqual(['overdue', 'out', 'upcoming', 'low']);
  });
});

describe('buildBarChart (F7-T04)', () => {
  const daily = [
    { date: '2026-11-17', cashColones: 10000, installmentsColones: 0 },
    { date: '2026-11-18', cashColones: 0, installmentsColones: 0 },
    { date: '2026-11-19', cashColones: 5000, installmentsColones: 15000 },
  ];

  it('scales the tallest day to the top and stacks installments on cash', () => {
    const chart = buildBarChart(daily, 320);
    const [first, empty, last] = chart.bars;
    expect(chart.maxColones).toBe(20000);
    expect(last?.installments.y).toBeCloseTo(8);
    expect(last?.cash.y).toBeCloseTo(
      (last?.installments.y ?? 0) + (last?.installments.height ?? 0),
    );
    expect(first?.cash.height).toBeCloseTo((chart.baseline - 8) / 2);
    expect(empty?.totalColones).toBe(0);
    expect(chart.gridLines.map((g) => g.valueColones)).toEqual([10000, 20000]);
  });

  it('labels every day for 7 days and every fifth for 30', () => {
    const month = Array.from({ length: 30 }, (_, i) => ({
      date: `d${String(i)}`,
      cashColones: 1,
      installmentsColones: 0,
    }));
    const labelled = buildBarChart(month).bars.filter((bar) => bar.showLabel).length;
    expect(labelled).toBe(7);
    expect(buildBarChart(daily).bars.every((bar) => bar.showLabel)).toBe(true);
  });
});

describe('mixPercent', () => {
  it('adds up to 100', () => {
    expect(mixPercent(1, 2)).toEqual({ cash: 33, installments: 67 });
    expect(mixPercent(0, 0)).toEqual({ cash: 0, installments: 0 });
  });
});
