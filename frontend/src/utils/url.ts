/**
 * Normalizes and builds a complete asset/endpoint URL.
 * Handles trailing slashes on apiBase and leading slashes on path.
 */
export function buildAssetUrl(path: string | null | undefined, apiBase: string = ''): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanBase = apiBase.trim().replace(/\/+$/, '');
  const cleanPath = path.trim().replace(/^\/+/, '');
  if (!cleanBase) {
    return `/${cleanPath}`;
  }
  return `${cleanBase}/${cleanPath}`;
}
