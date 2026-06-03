export interface CompressOptions {
  maxEdge?: number;
  quality?: number;
  mime?: 'image/jpeg' | 'image/webp';
}

const DEFAULTS: Required<CompressOptions> = {
  maxEdge: 1280,
  quality: 0.82,
  mime: 'image/jpeg',
};

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<string> {
  const { maxEdge, quality, mime } = { ...DEFAULTS, ...opts };
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context が取れません');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL(mime, quality);
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to HTMLImageElement
    }
  }
  return new Promise<ImageBitmap>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const fakeBitmap = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        close() {
          /* noop */
        },
      } as ImageBitmap;
      const canvas = document.createElement('canvas');
      canvas.width = fakeBitmap.width;
      canvas.height = fakeBitmap.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(fakeBitmap);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };
    img.src = url;
  });
}

export function isLikelyHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}
