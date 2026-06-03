import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useData } from '../context/DataContext';
import { uniqueValues } from '../lib/aggregations';
import { compressImage, isLikelyHeic } from '../lib/photo';
import type { Catch } from '../types';

interface CatchFormProps {
  open: boolean;
  onClose: () => void;
  initialLatLng?: { lat: number; lng: number } | null;
}

interface FormState {
  caught_at: string; // datetime-local
  species: string;
  spot_name: string;
  latitude: string;
  longitude: string;
  count: string;
  length_cm: string;
  weight_g: string;
  depth_m: string;
  water_temp_c: string;
  rig: string;
  bait: string;
  lure: string;
  weather: string;
  tide: string;
  notes: string;
  release: boolean;
  photoDataUrl: string;
}

function blankForm(initial?: { lat: number; lng: number } | null): FormState {
  return {
    caught_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    species: '',
    spot_name: '',
    latitude: initial ? initial.lat.toFixed(6) : '',
    longitude: initial ? initial.lng.toFixed(6) : '',
    count: '1',
    length_cm: '',
    weight_g: '',
    depth_m: '',
    water_temp_c: '',
    rig: '',
    bait: '',
    lure: '',
    weather: '',
    tide: '',
    notes: '',
    release: false,
    photoDataUrl: '',
  };
}

function generateCatchId(date: Date): string {
  const stamp = format(date, 'yyyyMMddHHmmss');
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `U${stamp}-${rand}`;
}

function parseNumber(v: string): number {
  if (v.trim() === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function CatchForm({ open, onClose, initialLatLng }: CatchFormProps) {
  const { rows, addCatches } = useData();
  const [form, setForm] = useState<FormState>(() => blankForm(initialLatLng));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const speciesList = useMemo(() => uniqueValues(rows, (r) => r.species).sort(), [rows]);
  const spotList = useMemo(() => uniqueValues(rows, (r) => r.spot_name).sort(), [rows]);
  const spotByName = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number }>();
    for (const r of rows) {
      if (r.spot_name && Number.isFinite(r.latitude) && Number.isFinite(r.longitude)) {
        if (!m.has(r.spot_name)) m.set(r.spot_name, { lat: r.latitude, lng: r.longitude });
      }
    }
    return m;
  }, [rows]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSpotChange = (name: string) => {
    setForm((f) => {
      const next = { ...f, spot_name: name };
      const known = spotByName.get(name);
      if (known) {
        next.latitude = String(known.lat);
        next.longitude = String(known.lng);
      }
      return next;
    });
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (isLikelyHeic(file)) {
      setErr('HEIC はブラウザで圧縮できません。JPEG/PNG を選んでください。');
      return;
    }
    try {
      setBusy(true);
      const dataUrl = await compressImage(file, { maxEdge: 1280, quality: 0.82 });
      set('photoDataUrl', dataUrl);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '画像の処理に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!form.species.trim()) return setErr('魚種は必須です');
    if (!form.spot_name.trim()) return setErr('釣り場は必須です');
    const lat = parseNumber(form.latitude);
    const lng = parseNumber(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return setErr('緯度・経度は必須です (地図クリックで自動入力)');
    }
    const caught = new Date(form.caught_at);
    if (Number.isNaN(caught.getTime())) return setErr('日時の形式が不正です');

    const next: Catch = {
      catch_id: generateCatchId(caught),
      trip_id: `UTRIP-${format(caught, 'yyyyMMdd')}`,
      caught_at: caught,
      species: form.species.trim(),
      count: Math.max(1, parseNumber(form.count) || 1),
      length_cm: parseNumber(form.length_cm),
      weight_g: parseNumber(form.weight_g),
      depth_m: parseNumber(form.depth_m),
      rig: form.rig.trim(),
      bait: form.bait.trim(),
      lure: form.lure.trim(),
      color: '',
      action: '',
      release_flag: form.release,
      photo_path: form.photoDataUrl,
      notes: form.notes.trim(),
      spot_name: form.spot_name.trim(),
      latitude: lat,
      longitude: lng,
      water_temp_c: parseNumber(form.water_temp_c),
      weather: form.weather.trim(),
      tide: form.tide.trim(),
    };

    const result = addCatches([next]);
    if (result.added === 0) {
      setErr('追加に失敗しました (catch_id 重複)');
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catch-form-title"
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-[var(--border)] bg-[var(--card)] p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mincho text-[10px] uppercase tracking-[0.3em] text-[var(--sun)]">
              Add Catch
            </div>
            <h2 id="catch-form-title" className="font-serif text-xl text-[var(--foam)]">
              釣果を追加
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[var(--border)] px-3 py-1 font-mincho text-xs text-[var(--foam-dim)] hover:border-[var(--coral)] hover:text-[var(--coral)]"
          >
            閉じる
          </button>
        </div>

        <p className="mb-3 font-sans text-[11px] text-[var(--foam-dim)]">
          地図上の柱をクリック → 緯度経度が自動入力されます。追加した釣果は localStorage に保存され、CSV
          書出から書き出せます。
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="日時 *">
            <input
              type="datetime-local"
              required
              value={form.caught_at}
              onChange={(e) => set('caught_at', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="魚種 *">
            <input
              list="species-list"
              required
              value={form.species}
              onChange={(e) => set('species', e.target.value)}
              className={inputCls}
              placeholder="例: クロダイ"
            />
            <datalist id="species-list">
              {speciesList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="釣り場 *">
            <input
              list="spot-list"
              required
              value={form.spot_name}
              onChange={(e) => handleSpotChange(e.target.value)}
              className={inputCls}
              placeholder="例: 浦安総合公園"
            />
            <datalist id="spot-list">
              {spotList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="リリース">
            <label className="flex h-[34px] items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--bg)] px-3 font-sans text-xs text-[var(--foam)]">
              <input
                type="checkbox"
                checked={form.release}
                onChange={(e) => set('release', e.target.checked)}
                className="h-4 w-4 accent-[var(--sun)]"
              />
              リリースした
            </label>
          </Field>
          <Field label="緯度 *">
            <input
              required
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="経度 *">
            <input
              required
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="匹数">
            <input
              type="number"
              min={1}
              value={form.count}
              onChange={(e) => set('count', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="長さ (cm)">
            <input
              type="number"
              step="0.1"
              value={form.length_cm}
              onChange={(e) => set('length_cm', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="重さ (g)">
            <input
              type="number"
              value={form.weight_g}
              onChange={(e) => set('weight_g', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="水深 (m)">
            <input
              type="number"
              step="0.1"
              value={form.depth_m}
              onChange={(e) => set('depth_m', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="水温 (°C)">
            <input
              type="number"
              step="0.1"
              value={form.water_temp_c}
              onChange={(e) => set('water_temp_c', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="天気">
            <input
              value={form.weather}
              onChange={(e) => set('weather', e.target.value)}
              className={inputCls}
              placeholder="晴れ / 曇り / 雨"
            />
          </Field>
          <Field label="潮">
            <input
              value={form.tide}
              onChange={(e) => set('tide', e.target.value)}
              className={inputCls}
              placeholder="上げ三分 / 干潮 など"
            />
          </Field>
          <Field label="仕掛け">
            <input
              value={form.rig}
              onChange={(e) => set('rig', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="餌">
            <input
              value={form.bait}
              onChange={(e) => set('bait', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="ルアー">
            <input
              value={form.lure}
              onChange={(e) => set('lure', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-3">
          <div className="mb-1 font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
            メモ
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className={inputCls + ' min-h-[60px]'}
          />
        </div>

        <div className="mt-3">
          <div className="mb-1 font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
            写真 (1280px / JPEG 圧縮で保存)
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="block w-full text-xs text-[var(--foam-dim)] file:mr-3 file:rounded-sm file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-3 file:py-1.5 file:text-xs file:text-[var(--foam)]"
          />
          {form.photoDataUrl && (
            <img
              src={form.photoDataUrl}
              alt="プレビュー"
              className="mt-2 max-h-40 rounded-sm border border-[var(--border)]"
            />
          )}
        </div>

        {err && (
          <div
            role="alert"
            className="mt-4 rounded-sm border border-[var(--coral)] bg-[var(--coral)]/10 px-3 py-2 font-sans text-[12px] text-[var(--coral)]"
          >
            {err}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[var(--border)] px-4 py-2 font-mincho text-xs text-[var(--foam-dim)] hover:border-[var(--sky)] hover:text-[var(--sky)]"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-sm border border-[var(--sun)] bg-[var(--sun)]/15 px-5 py-2 font-mincho text-xs tracking-[0.2em] text-[var(--sun)] transition hover:bg-[var(--sun)]/25 disabled:opacity-50"
          >
            {busy ? '処理中…' : '追加'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'block w-full rounded-sm border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-sans text-sm text-[var(--foam)] focus:border-[var(--sun)] focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
        {label}
      </div>
      {children}
    </div>
  );
}
