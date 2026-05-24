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
  | { type: 'SET_DATE_RANGE'; payload: [Date, Date] | null }
  | { type: 'SET_SPECIES'; payload: string[] }
  | { type: 'SET_SPOTS'; payload: string[] }
  | { type: 'SET_WEATHER'; payload: string[] }
  | { type: 'SET_TIDES'; payload: string[] }
  | { type: 'TOGGLE_EXCLUDE_RELEASED' }
  | { type: 'SET_EXCLUDE_RELEASED'; payload: boolean }
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
