/**
 * Compresses a base64 image to a small thumbnail using Canvas API.
 * Keeps images within localStorage budget (~15KB per thumbnail at 160x120).
 */
export function createThumbnail(
  base64: string,
  mimeType: string,
  maxWidth = 320,
  maxHeight = 240,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve) => {
    // If already small enough (< 20KB), return as-is
    if (base64.length < 27000) {
      resolve(base64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down proportionally
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(base64); return; }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality).split(',')[1];
        resolve(compressed);
      } catch {
        // If canvas fails, return original
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * Builds a proper data URL from raw base64 by sniffing the image signature,
 * so PNG/WEBP/GIF screenshots aren't mislabeled as JPEG.
 */
export function base64ToDataUrl(base64: string): string {
  if (!base64) return '';
  if (base64.startsWith('data:')) return base64;
  let mime = 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) mime = 'image/png';
  else if (base64.startsWith('R0lGOD')) mime = 'image/gif';
  else if (base64.startsWith('UklGR')) mime = 'image/webp';
  else if (base64.startsWith('/9j/')) mime = 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

/**
 * Returns the approximate size of a localStorage key in KB.
 */
export function getStorageSizeKB(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(key) || '';
    return Math.round((val.length * 2) / 1024); // UTF-16 = 2 bytes per char
  } catch {
    return 0;
  }
}

/**
 * Returns total localStorage usage in KB.
 */
export function getTotalStorageKB(): number {
  if (typeof window === 'undefined') return 0;
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      total += (localStorage.getItem(key) || '').length * 2;
    }
    return Math.round(total / 1024);
  } catch {
    return 0;
  }
}
