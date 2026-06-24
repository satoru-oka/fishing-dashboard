import type { Catch } from '../types';

/** Build a Catch fixture with sensible defaults; override only what a test cares about. */
export function makeCatch(overrides: Partial<Catch> = {}): Catch {
  return {
    catch_id: 'c1',
    trip_id: 't1',
    caught_at: new Date(2024, 0, 15, 9, 0, 0),
    species: 'シーバス',
    count: 1,
    length_cm: 40,
    weight_g: 900,
    depth_m: 5,
    rig: '',
    bait: '',
    lure: 'ミノー',
    color: 'チャート',
    action: '',
    release_flag: false,
    photo_path: '',
    notes: '',
    spot_name: '若洲',
    latitude: 35.6,
    longitude: 139.8,
    water_temp_c: 18,
    weather: '晴れ',
    tide: '中潮',
    ...overrides,
  };
}
