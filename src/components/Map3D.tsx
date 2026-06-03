import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ColumnLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useData } from '../context/DataContext';
import { aggregateBySpot } from '../lib/aggregations';
import type { SpotAggregate } from '../types';
import { coralSunGoldStops, cssLinearGradient, lerpRgb } from '../theme';

const MAP_STYLES = {
  Demo: 'https://demotiles.maplibre.org/style.json',
  Dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  Voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
} as const;

type StyleKey = keyof typeof MAP_STYLES;

const INITIAL_VIEW_STATE = {
  longitude: 139.85,
  latitude: 35.5,
  zoom: 10,
  pitch: 45,
  bearing: 0,
};

function colorForLength(t: number): [number, number, number, number] {
  const [r, g, b] = lerpRgb(coralSunGoldStops, t);
  return [r, g, b, 230];
}

const LEGEND_GRADIENT = cssLinearGradient(coralSunGoldStops);

interface TooltipState {
  x: number;
  y: number;
  spot: SpotAggregate;
}

export function Map3D() {
  const { filtered, filter, setSpots } = useData();
  const [styleKey, setStyleKey] = useState<StyleKey>('Dark');
  const [hover, setHover] = useState<TooltipState | null>(null);
  const [elevAnim, setElevAnim] = useState(0); // 0..1 grows on mount
  const aggregates = useMemo(() => aggregateBySpot(filtered), [filtered]);

  // grow on mount
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setElevAnim(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const lengthRange = useMemo(() => {
    if (aggregates.length === 0) return [0, 1] as [number, number];
    let mn = Infinity;
    let mx = -Infinity;
    for (const a of aggregates) {
      if (a.avg_length > 0) {
        if (a.avg_length < mn) mn = a.avg_length;
        if (a.avg_length > mx) mx = a.avg_length;
      }
    }
    if (!Number.isFinite(mn) || !Number.isFinite(mx) || mn === mx) return [0, 1] as [number, number];
    return [mn, mx] as [number, number];
  }, [aggregates]);

  const elevationScale = 200 * elevAnim;

  const layers = useMemo(
    () => [
      new ColumnLayer<SpotAggregate>({
        id: 'spot-columns',
        data: aggregates,
        diskResolution: 24,
        radius: 600,
        extruded: true,
        pickable: true,
        elevationScale,
        getPosition: (d) => [d.longitude, d.latitude],
        getElevation: (d) => d.count,
        getFillColor: (d) => {
          const t =
            lengthRange[1] === lengthRange[0]
              ? 0.5
              : (d.avg_length - lengthRange[0]) / (lengthRange[1] - lengthRange[0]);
          return colorForLength(t);
        },
        getLineColor: [255, 220, 180, 90],
        material: {
          ambient: 0.55,
          diffuse: 0.7,
          shininess: 32,
          specularColor: [255, 220, 180],
        },
        onClick: (info: PickingInfo) => {
          const d = info.object as SpotAggregate | undefined;
          if (!d) return;
          const already = filter.spots.length === 1 && filter.spots[0] === d.spot_name;
          setSpots(already ? [] : [d.spot_name]);
        },
        onHover: (info: PickingInfo) => {
          if (info.object && info.x !== undefined && info.y !== undefined) {
            setHover({ x: info.x, y: info.y, spot: info.object as SpotAggregate });
          } else {
            setHover(null);
          }
        },
        updateTriggers: {
          getFillColor: [lengthRange[0], lengthRange[1]],
        },
      }),
    ],
    [aggregates, elevationScale, filter.spots, lengthRange, setSpots],
  );

  return (
    <div className="reveal relative h-full min-h-[460px] w-full overflow-hidden border-r border-[var(--border)]">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getCursor={({ isDragging, isHovering }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
        }
      >
        <Map
          reuseMaps
          mapStyle={MAP_STYLES[styleKey]}
          attributionControl={false}
        />
      </DeckGL>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 max-w-[260px] rounded-sm border border-[var(--border)] bg-[var(--card)]/90 p-3 backdrop-blur">
        <div className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">Legend</div>
        <div className="mt-2 font-sans text-[11px] text-[var(--foam)]">
          <div>高さ <span className="text-[var(--sky)]">= 釣果数</span></div>
          <div>色 <span className="text-[var(--sky)]">= 平均体長</span></div>
        </div>
        <div className="mt-2 h-2 w-full rounded-sm" style={{ background: LEGEND_GRADIENT }} />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--foam-dim)]">
          <span>{lengthRange[0].toFixed(0)}cm</span>
          <span>{lengthRange[1].toFixed(0)}cm</span>
        </div>
      </div>

      {/* Style switcher */}
      <div className="absolute bottom-4 right-4 flex gap-1 rounded-sm border border-[var(--border)] bg-[var(--card)]/90 p-1 backdrop-blur">
        {(Object.keys(MAP_STYLES) as StyleKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setStyleKey(k)}
            className={
              'rounded-sm px-2.5 py-1 font-mincho text-[10px] uppercase tracking-[0.2em] transition ' +
              (styleKey === k
                ? 'bg-[var(--sun)] text-[var(--bg-deep)]'
                : 'text-[var(--foam-dim)] hover:text-[var(--foam)]')
            }
          >
            {k}
          </button>
        ))}
      </div>

      {/* Tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-50 max-w-[200px] rounded-sm border border-[var(--sun)] bg-[var(--card-2)] p-3 shadow-lg"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-mincho text-sm text-[var(--foam)]">{hover.spot.spot_name}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] text-[var(--foam-dim)]">
            <div>釣果</div>
            <div className="text-right text-[var(--sun)]">{hover.spot.count}</div>
            <div>平均</div>
            <div className="text-right text-[var(--gold)]">{hover.spot.avg_length.toFixed(1)} cm</div>
            <div>最大</div>
            <div className="text-right text-[var(--coral)]">{hover.spot.max_weight.toLocaleString()} g</div>
          </div>
          <div className="mt-1 font-sans text-[10px] text-[var(--sky)]">クリックで絞り込み</div>
        </div>
      )}

      {/* Empty state */}
      {aggregates.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-sm border border-[var(--border)] bg-[var(--card)]/90 px-6 py-3 font-mincho text-sm text-[var(--foam-dim)] backdrop-blur">
            該当する釣果がありません
          </div>
        </div>
      )}
    </div>
  );
}
