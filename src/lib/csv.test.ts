import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseCsvText, loadCatches } from './csv';

const HEADER = 'catch_id,trip_id,caught_at,species,count,release_flag';

describe('parseCsvText', () => {
  it('parses a well-formed row', () => {
    const text = `${HEADER}\nc1,t1,2024-01-15T09:00:00,シーバス,2,no\n`;
    const { rows, skipped } = parseCsvText(text);
    expect(skipped).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].catch_id).toBe('c1');
    expect(rows[0].species).toBe('シーバス');
    expect(rows[0].count).toBe(2);
  });

  it('skips rows missing catch_id or with an unparseable date', () => {
    const text =
      `${HEADER}\n` +
      `,t1,2024-01-15T09:00:00,シーバス,1,no\n` + // no catch_id
      `c2,t1,not-a-date,シーバス,1,no\n` + // bad date
      `c3,t1,2024-02-01T09:00:00,クロダイ,1,no\n`; // valid
    const { rows, skipped } = parseCsvText(text);
    expect(rows.map((r) => r.catch_id)).toEqual(['c3']);
    expect(skipped).toBe(2);
  });

  it('interprets release_flag case-insensitively (only "yes" is released)', () => {
    const text =
      `${HEADER}\n` +
      `c1,t1,2024-01-15T09:00:00,A,1,yes\n` +
      `c2,t1,2024-01-15T09:00:00,A,1,YES\n` +
      `c3,t1,2024-01-15T09:00:00,A,1,no\n` +
      `c4,t1,2024-01-15T09:00:00,A,1,\n`;
    const { rows } = parseCsvText(text);
    expect(rows.map((r) => r.release_flag)).toEqual([true, true, false, false]);
  });

  it('falls back to count=1 when count is missing or non-numeric', () => {
    const text =
      `${HEADER}\n` +
      `c1,t1,2024-01-15T09:00:00,A,,no\n` + // empty count
      `c2,t1,2024-01-15T09:00:00,A,abc,no\n`; // non-numeric
    const { rows } = parseCsvText(text);
    expect(rows.map((r) => r.count)).toEqual([1, 1]);
  });

  // #55: count=0 must be preserved, not coerced to 1 (previously `num(...) || 1`).
  it('preserves count=0 instead of coercing it to 1 (#55)', () => {
    const text = `${HEADER}\nc1,t1,2024-01-15T09:00:00,A,0,no\n`;
    const { rows } = parseCsvText(text);
    expect(rows[0].count).toBe(0);
  });
});

describe('loadCatches', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and parses CSV from the given url', async () => {
    const text = `${HEADER}\nc1,t1,2024-01-15T09:00:00,シーバス,1,no\n`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', text: async () => text })),
    );
    const rows = await loadCatches('/data/catches_enriched.csv');
    expect(rows).toHaveLength(1);
    expect(rows[0].catch_id).toBe('c1');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found', text: async () => '' })),
    );
    await expect(loadCatches('/data/missing.csv')).rejects.toThrow(/404/);
  });
});
