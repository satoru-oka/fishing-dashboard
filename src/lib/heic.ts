// HEIC → JPEG 変換ヘルパー。heic2any はサイズが大きいので動的 import で
// 必要時にだけロードする。実体は main thread で走るが、`requestIdleCallback`
// が使える環境では idle 時に変換を行うため、UI のメインインタラクションを
// 妨げにくい。

let heic2anyPromise: Promise<typeof import('heic2any').default> | null = null;

async function getHeic2any(): Promise<typeof import('heic2any').default> {
  if (!heic2anyPromise) {
    heic2anyPromise = import('heic2any').then((m) => m.default);
  }
  return heic2anyPromise;
}

export async function convertHeicToJpegUrl(input: Blob): Promise<string> {
  const heic2any = await getHeic2any();
  const out = await heic2any({
    blob: input,
    toType: 'image/jpeg',
    quality: 0.85,
  });
  const blob = Array.isArray(out) ? out[0] : out;
  return URL.createObjectURL(blob);
}

export function isHeicSrc(src: string): boolean {
  const lower = src.toLowerCase();
  return lower.endsWith('.heic') || lower.endsWith('.heif');
}

export async function fetchAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`画像の取得に失敗しました (${res.status})`);
  return res.blob();
}
