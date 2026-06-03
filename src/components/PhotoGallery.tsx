import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useData } from '../context/DataContext';
import { convertHeicToJpegUrl, fetchAsBlob, isHeicSrc } from '../lib/heic';
import type { Catch } from '../types';

interface PhotoItem {
  catchId: string;
  caughtAt: Date;
  species: string;
  spotName: string;
  rawPath: string;
}

function toPhotoItems(rows: Catch[]): PhotoItem[] {
  return rows
    .filter((r) => r.photo_path)
    .map((r) => ({
      catchId: r.catch_id,
      caughtAt: r.caught_at,
      species: r.species,
      spotName: r.spot_name,
      rawPath: r.photo_path,
    }))
    .sort((a, b) => b.caughtAt.getTime() - a.caughtAt.getTime());
}

function resolveBaseUrl(path: string): string {
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const base = import.meta.env.BASE_URL ?? '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\/+/, '');
}

interface ResolvedSrc {
  src: string;
  loading: boolean;
  error: string | null;
}

function initialResolvedSrc(rawPath: string): ResolvedSrc {
  if (rawPath.startsWith('data:')) {
    return { src: rawPath, loading: false, error: null };
  }
  if (!isHeicSrc(rawPath)) {
    return { src: resolveBaseUrl(rawPath), loading: false, error: null };
  }
  return { src: '', loading: true, error: null };
}

function useResolvedSrc(rawPath: string): ResolvedSrc {
  const [state, setState] = useState<ResolvedSrc>(() => initialResolvedSrc(rawPath));

  useEffect(() => {
    if (!isHeicSrc(rawPath) || rawPath.startsWith('data:')) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    (async () => {
      try {
        const blob = await fetchAsBlob(resolveBaseUrl(rawPath));
        const url = await convertHeicToJpegUrl(blob);
        createdUrl = url;
        if (!cancelled) setState({ src: url, loading: false, error: null });
      } catch (e) {
        if (!cancelled)
          setState({
            src: '',
            loading: false,
            error: e instanceof Error ? e.message : '変換に失敗しました',
          });
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [rawPath]);

  return state;
}

function PhotoTile({
  item,
  onOpen,
}: {
  item: PhotoItem;
  onOpen: (item: PhotoItem, resolvedSrc: string) => void;
}) {
  const { src, loading, error } = useResolvedSrc(item.rawPath);
  return (
    <button
      type="button"
      onClick={() => src && onOpen(item, src)}
      disabled={!src}
      className="group relative aspect-square overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg)] focus:border-[var(--sun)] focus:outline-none disabled:cursor-not-allowed"
    >
      {loading && (
        <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-[var(--sky)]">
          HEIC → JPEG…
        </div>
      )}
      {error && !loading && (
        <div className="flex h-full w-full items-center justify-center px-2 text-center font-mono text-[10px] text-[var(--coral)]">
          {error}
        </div>
      )}
      {src && !loading && (
        <img
          src={src}
          alt={`${item.species} - ${item.spotName}`}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-left">
        <div className="font-mincho text-[10px] text-[var(--foam)]">{item.species}</div>
        <div className="font-mono text-[9px] text-[var(--sky)]">
          {format(item.caughtAt, 'yyyy.MM.dd')}
        </div>
      </div>
    </button>
  );
}

function Lightbox({
  item,
  src,
  onClose,
}: {
  item: PhotoItem;
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[92vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={`${item.species} - ${item.spotName}`}
          className="max-h-[88vh] max-w-[92vw] rounded-sm object-contain"
        />
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-[var(--foam-dim)]">
          <div>
            <span className="font-mincho text-[var(--sun)]">{item.species}</span>
            <span className="ml-3 text-[var(--sky)]">{item.spotName}</span>
            <span className="ml-3">{format(item.caughtAt, 'yyyy.MM.dd HH:mm')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[var(--foam)] hover:border-[var(--coral)] hover:text-[var(--coral)]"
            aria-label="閉じる"
          >
            閉じる (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

export function PhotoGallery() {
  const { filtered, filter } = useData();
  const items = useMemo(() => toPhotoItems(filtered), [filtered]);
  const [open, setOpen] = useState<{ item: PhotoItem; src: string } | null>(null);

  // 釣り場フィルタが立っている時のみ表示 — 「釣り場詳細画面」相当
  if (filter.spots.length === 0) return null;
  if (items.length === 0) {
    return (
      <section className="reveal border-y border-[var(--border)] bg-[var(--bg)] px-8 py-4">
        <SectionHeader spots={filter.spots} count={0} />
        <p className="font-sans text-xs text-[var(--foam-dim)]">写真付きの釣果がありません。</p>
      </section>
    );
  }

  return (
    <section className="reveal border-y border-[var(--border)] bg-[var(--bg)] px-8 py-5">
      <SectionHeader spots={filter.spots} count={items.length} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((it) => (
          <PhotoTile key={it.catchId} item={it} onOpen={(item, src) => setOpen({ item, src })} />
        ))}
      </div>
      {open && <Lightbox item={open.item} src={open.src} onClose={() => setOpen(null)} />}
    </section>
  );
}

function SectionHeader({ spots, count }: { spots: string[]; count: number }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-3">
      <div>
        <div className="font-mincho text-[10px] uppercase tracking-[0.3em] text-[var(--sun)]">
          Photo Gallery
        </div>
        <div className="font-serif text-base text-[var(--foam)]">{spots.join(' / ')}</div>
      </div>
      {count > 0 && (
        <div className="ml-auto font-mono text-[11px] text-[var(--sky)]">{count} photos</div>
      )}
    </div>
  );
}
