import Papa from 'papaparse';
import { format } from 'date-fns';
import type { Catch } from '../types';

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return NaN;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : NaN;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

const DEFAULT_CSV_URL = `${import.meta.env.BASE_URL}data/catches_enriched.csv`;

export const CSV_COLUMNS = [
  'catch_id',
  'trip_id',
  'caught_at',
  'species',
  'count',
  'length_cm',
  'weight_g',
  'depth_m',
  'rig',
  'bait',
  'lure',
  'color',
  'action',
  'release_flag',
  'photo_path',
  'notes',
  'spot_name',
  'latitude',
  'longitude',
  'water_temp_c',
  'weather',
  'tide',
] as const;

function rowFromRecord(r: Record<string, string>): Catch | null {
  if (!r || !r['catch_id']) return null;
  const caughtRaw = str(r['caught_at']);
  const caughtAt = new Date(caughtRaw);
  if (Number.isNaN(caughtAt.getTime())) return null;
  return {
    catch_id: str(r['catch_id']),
    trip_id: str(r['trip_id']),
    caught_at: caughtAt,
    species: str(r['species']),
    count: num(r['count']) || 1,
    length_cm: num(r['length_cm']),
    weight_g: num(r['weight_g']),
    depth_m: num(r['depth_m']),
    rig: str(r['rig']),
    bait: str(r['bait']),
    lure: str(r['lure']),
    color: str(r['color']),
    action: str(r['action']),
    release_flag: str(r['release_flag']).toLowerCase() === 'yes',
    photo_path: str(r['photo_path']),
    notes: str(r['notes']),
    spot_name: str(r['spot_name']),
    latitude: num(r['latitude']),
    longitude: num(r['longitude']),
    water_temp_c: num(r['water_temp_c']),
    weather: str(r['weather']),
    tide: str(r['tide']),
  };
}

export async function loadCatches(url: string = DEFAULT_CSV_URL): Promise<Catch[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CSV ロード失敗: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCsvText(text).rows;
}

export interface ParseResult {
  rows: Catch[];
  skipped: number;
  errors: string[];
}

export function parseCsvText(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  const errors: string[] = [];
  for (const e of parsed.errors) {
    if (e.type !== 'FieldMismatch') errors.push(e.message);
  }
  const rows: Catch[] = [];
  let skipped = 0;
  for (const r of parsed.data) {
    const c = rowFromRecord(r);
    if (c) rows.push(c);
    else skipped += 1;
  }
  return { rows, skipped, errors };
}

function formatLocalDateTime(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss");
}

function csvValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : formatLocalDateTime(v);
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  const s = String(v);
  if (s === '') return '';
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows: Catch[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = rows.map((r) =>
    CSV_COLUMNS.map((k) => {
      if (k === 'release_flag') return csvValue(r.release_flag);
      if (k === 'caught_at') return csvValue(r.caught_at);
      return csvValue(r[k]);
    }).join(','),
  );
  return [header, ...lines].join('\n') + '\n';
}

export interface MergeResult {
  added: number;
  duplicates: number;
  merged: Catch[];
}

export function mergeCatches(existing: Catch[], incoming: Catch[]): MergeResult {
  const seen = new Set(existing.map((r) => r.catch_id));
  const out = [...existing];
  let added = 0;
  let duplicates = 0;
  for (const r of incoming) {
    if (seen.has(r.catch_id)) {
      duplicates += 1;
      continue;
    }
    seen.add(r.catch_id);
    out.push(r);
    added += 1;
  }
  return { added, duplicates, merged: out };
}
