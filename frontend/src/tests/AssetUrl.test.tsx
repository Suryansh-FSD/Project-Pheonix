import { describe, it, expect } from 'vitest';
import { buildAssetUrl } from '../utils/url';

describe('buildAssetUrl pure utility tests', () => {
  it('correctly joins relative path with a non-empty API base', () => {
    const result = buildAssetUrl('/api/jobs/123/previews/lr_rgb.png', 'https://geosr-tunnel.trycloudflare.com');
    expect(result).toBe('https://geosr-tunnel.trycloudflare.com/api/jobs/123/previews/lr_rgb.png');
  });

  it('correctly handles relative path without an API base', () => {
    const result = buildAssetUrl('/api/jobs/123/previews/lr_rgb.png', '');
    expect(result).toBe('/api/jobs/123/previews/lr_rgb.png');
  });

  it('preserves absolute HTTPS URLs unchanged regardless of API base', () => {
    const absUrl = 'https://s3.amazonaws.com/sentinel-imagery/sample.png';
    expect(buildAssetUrl(absUrl, 'https://geosr-tunnel.trycloudflare.com')).toBe(absUrl);
    expect(buildAssetUrl(absUrl, '')).toBe(absUrl);
  });

  it('normalizes trailing slashes on API base and leading slashes on path', () => {
    const result1 = buildAssetUrl('api/health', 'https://geosr-tunnel.trycloudflare.com/');
    expect(result1).toBe('https://geosr-tunnel.trycloudflare.com/api/health');

    const result2 = buildAssetUrl('/api/health', 'https://geosr-tunnel.trycloudflare.com///');
    expect(result2).toBe('https://geosr-tunnel.trycloudflare.com/api/health');

    const result3 = buildAssetUrl('///api/health', 'https://geosr-tunnel.trycloudflare.com');
    expect(result3).toBe('https://geosr-tunnel.trycloudflare.com/api/health');
  });

  it('returns empty string for null, undefined, or empty path', () => {
    expect(buildAssetUrl(null, 'https://example.com')).toBe('');
    expect(buildAssetUrl(undefined, 'https://example.com')).toBe('');
    expect(buildAssetUrl('', 'https://example.com')).toBe('');
  });
});
