import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type { Catch, FilterAction, FilterState } from '../types';
import { loadCatches } from '../lib/csv';
import { applyFilters, getDataDateRange } from '../lib/aggregations';
import { readUrlFilter, syncUrl } from '../lib/url-state';

const initialFilter: FilterState = {
  dateRange: null,
  species: [],
  spots: [],
  weather: [],
  tides: [],
  excludeReleased: false,
};

function reducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    case 'SET_SPECIES':
      return { ...state, species: action.payload };
    case 'SET_SPOTS':
      return { ...state, spots: action.payload };
    case 'SET_WEATHER':
      return { ...state, weather: action.payload };
    case 'SET_TIDES':
      return { ...state, tides: action.payload };
    case 'TOGGLE_EXCLUDE_RELEASED':
      return { ...state, excludeReleased: !state.excludeReleased };
    case 'SET_EXCLUDE_RELEASED':
      return { ...state, excludeReleased: action.payload };
    case 'HYDRATE':
      return { ...state, ...action.payload };
    case 'RESET':
      return { ...initialFilter };
    default:
      return state;
  }
}

interface DataContextValue {
  loading: boolean;
  error: string | null;
  rows: Catch[];
  filtered: Catch[];
  filter: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  dataRange: [Date, Date] | null;
  reset: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, dispatch] = useReducer(reducer, initialFilter);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCatches()
      .then((rs) => {
        if (cancelled) return;
        setRows(rs);
        // hydrate from URL after data loads
        const fromUrl = readUrlFilter();
        if (Object.keys(fromUrl).length > 0) {
          dispatch({ type: 'HYDRATE', payload: fromUrl });
        }
        setHydrated(true);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    syncUrl(filter);
  }, [filter, hydrated]);

  const filtered = useMemo(() => applyFilters(rows, filter), [rows, filter]);
  const dataRange = useMemo(() => getDataDateRange(rows), [rows]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value: DataContextValue = {
    loading,
    error,
    rows,
    filtered,
    filter,
    dispatch,
    dataRange,
    reset,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const v = useContext(DataContext);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}
