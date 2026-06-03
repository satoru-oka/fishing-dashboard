export interface Catch {
  catch_id: string;
  trip_id: string;
  caught_at: Date;
  species: string;
  count: number;
  length_cm: number;
  weight_g: number;
  depth_m: number;
  rig: string;
  bait: string;
  lure: string;
  color: string;
  action: string;
  release_flag: boolean; // true = released
  photo_path: string;
  notes: string;
  spot_name: string;
  latitude: number;
  longitude: number;
  water_temp_c: number;
  weather: string;
  tide: string;
}

export interface FilterState {
  dateRange: [Date, Date] | null;
  species: string[];
  spots: string[];
  weather: string[];
  tides: string[];
  excludeReleased: boolean;
}

export type FilterAction =
  | { [K in keyof FilterState]: { type: 'SET'; key: K; value: FilterState[K] } }[keyof FilterState]
  | { type: 'RESET' }
  | { type: 'HYDRATE'; payload: Partial<FilterState> };

export interface SpotAggregate {
  spot_name: string;
  latitude: number;
  longitude: number;
  count: number;
  avg_length: number;
  max_weight: number;
}
