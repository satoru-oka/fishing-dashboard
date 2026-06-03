import {
  createContext,
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
    case 'SET':
      return { ...state, [action.key]: action.value };
    case 'HYDRATE':
      return { ...state, ...action.payload };
    case 'RESET':
      return { ...initialFilter };
  }
}

interface DataContextValue {
  loading: boolean;
  error: string | null;
  rows: Catch[];
  filtered: Catch[];
  filter: FilterState;
  dataRange: [Date, Date] | null;
  setDateRange: (v: FilterState['dateRange']) => void;
  setSpecies: (v: string[]) => void;
  setSpots: (v: string[]) => void;
  setWeather: (v: string[]) => void;
  setTides: (v: string[]) => void;
  setExcludeReleased: (v: boolean) => void;
  toggleExcludeReleased: () => void;
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

  // Back/forward navigation: re-hydrate from the URL.
  useEffect(() => {
    if (!hydrated) return;
    const onPop = () => {
      dispatch({ type: 'RESET' });
      const fromUrl = readUrlFilter();
      if (Object.keys(fromUrl).length > 0) {
        dispatch({ type: 'HYDRATE', payload: fromUrl });
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [hydrated]);

  const filtered = useMemo(() => applyFilters(rows, filter), [rows, filter]);
  const dataRange = useMemo(() => getDataDateRange(rows), [rows]);

  const value: DataContextValue = {
    loading,
    error,
    rows,
    filtered,
    filter,
    dataRange,
    setDateRange: (v) => dispatch({ type: 'SET', key: 'dateRange', value: v }),
    setSpecies: (v) => dispatch({ type: 'SET', key: 'species', value: v }),
    setSpots: (v) => dispatch({ type: 'SET', key: 'spots', value: v }),
    setWeather: (v) => dispatch({ type: 'SET', key: 'weather', value: v }),
    setTides: (v) => dispatch({ type: 'SET', key: 'tides', value: v }),
    setExcludeReleased: (v) => dispatch({ type: 'SET', key: 'excludeReleased', value: v }),
    toggleExcludeReleased: () =>
      dispatch({ type: 'SET', key: 'excludeReleased', value: !filter.excludeReleased }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const v = useContext(DataContext);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}
