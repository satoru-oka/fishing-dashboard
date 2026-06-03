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
import { loadCatches, mergeCatches } from '../lib/csv';
import { applyFilters, getDataDateRange } from '../lib/aggregations';
import { readUrlFilter, syncUrl } from '../lib/url-state';
import { clearUserCatches, loadUserCatches, saveUserCatches } from '../lib/local-store';

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
  baseRows: Catch[];
  userRows: Catch[];
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
  addCatches: (incoming: Catch[]) => { added: number; duplicates: number };
  removeUserCatch: (catchId: string) => void;
  clearAllUserCatches: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [baseRows, setBaseRows] = useState<Catch[]>([]);
  const [userRows, setUserRows] = useState<Catch[]>(() => loadUserCatches());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, dispatch] = useReducer(reducer, initialFilter);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCatches()
      .then((rs) => {
        if (cancelled) return;
        setBaseRows(rs);
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

  const rows = useMemo(
    () => mergeCatches(baseRows, userRows).merged,
    [baseRows, userRows],
  );
  const filtered = useMemo(() => applyFilters(rows, filter), [rows, filter]);
  const dataRange = useMemo(() => getDataDateRange(rows), [rows]);

  const addCatches = useCallback(
    (incoming: Catch[]) => {
      const merged = mergeCatches(rows, incoming);
      const onlyNew = merged.merged.slice(rows.length);
      setUserRows((prev) => {
        const next = [...prev, ...onlyNew];
        saveUserCatches(next);
        return next;
      });
      return { added: merged.added, duplicates: merged.duplicates };
    },
    [rows],
  );

  const removeUserCatch = useCallback((catchId: string) => {
    setUserRows((prev) => {
      const next = prev.filter((r) => r.catch_id !== catchId);
      saveUserCatches(next);
      return next;
    });
  }, []);

  const clearAllUserCatches = useCallback(() => {
    setUserRows([]);
    clearUserCatches();
  }, []);

  const value: DataContextValue = {
    loading,
    error,
    rows,
    baseRows,
    userRows,
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
    addCatches,
    removeUserCatch,
    clearAllUserCatches,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const v = useContext(DataContext);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}
