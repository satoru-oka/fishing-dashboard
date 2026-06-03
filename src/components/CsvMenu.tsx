import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { useData } from '../context/DataContext';
import { parseCsvText, rowsToCsv } from '../lib/csv';

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CsvMenu() {
  const { filtered, addCatches } = useData();
  const [status, setStatus] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (filtered.length === 0) {
      setStatus({ kind: 'warn', text: '書き出し対象が 0 件です' });
      return;
    }
    const csv = rowsToCsv(filtered);
    const stamp = format(new Date(), 'yyyyMMdd-HHmmss');
    downloadBlob(`catches-${stamp}.csv`, csv, 'text/csv;charset=utf-8');
    setStatus({ kind: 'ok', text: `${filtered.length} 件を書き出しました` });
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseCsvText(text);
      if (result.rows.length === 0) {
        setStatus({
          kind: 'err',
          text: result.errors[0] ?? '読み込めた行がありません (列名と日時形式を確認してください)',
        });
        return;
      }
      const { added, duplicates } = addCatches(result.rows);
      const parts = [`+${added} 件`];
      if (duplicates > 0) parts.push(`重複 ${duplicates} 件はスキップ`);
      if (result.skipped > 0) parts.push(`不正 ${result.skipped} 行を無視`);
      setStatus({ kind: added > 0 ? 'ok' : 'warn', text: parts.join(' / ') });
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : '読み込みに失敗しました' });
    }
  };

  const statusColor =
    status?.kind === 'ok'
      ? 'text-[var(--algae)]'
      : status?.kind === 'warn'
      ? 'text-[var(--sun)]'
      : 'text-[var(--coral)]';

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-mincho text-[10px] uppercase tracking-[0.2em] text-[var(--foam-dim)] transition hover:border-[var(--sky)] hover:text-[var(--sky)]"
        >
          CSV 書出
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-mincho text-[10px] uppercase tracking-[0.2em] text-[var(--foam-dim)] transition hover:border-[var(--sun)] hover:text-[var(--sun)]"
        >
          CSV 読込
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {status && (
        <div className={`font-mono text-[10px] ${statusColor}`} role="status">
          {status.text}
        </div>
      )}
    </div>
  );
}
