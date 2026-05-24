import Papa from 'papaparse';
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

export async function loadCatches(url: string = DEFAULT_CSV_URL): Promise<Catch[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CSV ロード失敗: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.find((e) => e.type !== 'FieldMismatch');
    if (fatal) {
      throw new Error(`CSV パース失敗: ${fatal.message}`);
    }
  }
  const rows: Catch[] = [];
  for (const r of parsed.data) {
    if (!r || !r['catch_id']) continue;
    const caughtRaw = str(r['caught_at']);
    const caughtAt = new Date(caughtRaw);
    if (Number.isNaN(caughtAt.getTime())) continue;
    rows.push({
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
    });
  }
  return rows;
}
