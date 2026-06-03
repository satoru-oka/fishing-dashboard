import { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Header } from './components/Header';
import { ActiveFilters } from './components/ActiveFilters';
import { KpiStrip } from './components/KpiStrip';
import { Map3D } from './components/Map3D';
import { FiltersPanel } from './components/FiltersPanel';
import { TimeSlider } from './components/TimeSlider';
import { ChartsGrid } from './components/ChartsGrid';
import { CatchForm } from './components/CatchForm';
import { PhotoGallery } from './components/PhotoGallery';

function Skeleton() {
  return (
    <div className="grid min-h-screen grid-rows-[auto_auto_1fr] gap-3 p-6">
      <div className="skeleton h-20" />
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-3">
        <div className="skeleton h-[460px]" />
        <div className="skeleton h-[460px]" />
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md rounded-sm border border-[var(--coral)] bg-[var(--card)] p-6">
        <div className="font-mincho text-xs uppercase tracking-[0.3em] text-[var(--coral)]">Error</div>
        <h2 className="mt-2 font-serif text-2xl text-[var(--foam)]">データ読み込み失敗</h2>
        <p className="mt-2 font-sans text-sm text-[var(--foam-dim)]">{message}</p>
        <p className="mt-3 font-mono text-[11px] text-[var(--sky)]">
          ヒント: <span className="text-[var(--foam-dim)]">data/catches_enriched.csv</span> が repo 直下にあるか確認してください。
        </p>
      </div>
    </div>
  );
}

function Shell() {
  const { loading, error } = useData();
  const [formOpen, setFormOpen] = useState(false);
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null);

  if (loading) return <Skeleton />;
  if (error) return <ErrorScreen message={error} />;

  const handlePick = (lat: number, lng: number) => {
    setPickedLatLng({ lat, lng });
    setFormOpen(true);
  };

  return (
    <main className="min-h-screen">
      <Header onOpenForm={() => setFormOpen(true)} />
      <ActiveFilters />
      <KpiStrip />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px]">
        <div className="min-h-[480px]">
          <Map3D onPickLocation={handlePick} />
        </div>
        <FiltersPanel />
      </div>
      <TimeSlider />
      <PhotoGallery />
      <ChartsGrid />
      <footer className="border-t border-[var(--border)] px-8 py-6 text-center font-mincho text-[11px] uppercase tracking-[0.3em] text-[var(--sky-dim)]">
        Tokyo Bay · 釣果ジャーナリズム · {new Date().getFullYear()}
      </footer>
      <CatchForm
        key={formOpen ? `form-${pickedLatLng?.lat ?? ''}-${pickedLatLng?.lng ?? ''}` : 'form-closed'}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setPickedLatLng(null);
        }}
        initialLatLng={pickedLatLng}
      />
    </main>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
