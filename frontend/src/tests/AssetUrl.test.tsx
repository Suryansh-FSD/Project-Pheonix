import { describe, it, expect } from 'vitest';
import { buildAssetUrl } from '../utils/url';

const TEST_MODAL_BASE = 'https://suryansh-fsd--project-pheonix-backend-modalapp-fastapi-backend.modal.run';

describe('buildAssetUrl pure utility tests', () => {
  it('correctly joins relative path with a non-empty API base', () => {
    const result = buildAssetUrl('/api/jobs/123/previews/lr_rgb.png', TEST_MODAL_BASE);
    expect(result).toBe(`${TEST_MODAL_BASE}/api/jobs/123/previews/lr_rgb.png`);
  });

  it('correctly handles relative path without an API base', () => {
    const result = buildAssetUrl('/api/jobs/123/previews/lr_rgb.png', '');
    expect(result).toBe('/api/jobs/123/previews/lr_rgb.png');
  });

  it('preserves absolute HTTPS URLs unchanged regardless of API base', () => {
    const absUrl = 'https://s3.amazonaws.com/sentinel-imagery/sample.png';
    expect(buildAssetUrl(absUrl, TEST_MODAL_BASE)).toBe(absUrl);
    expect(buildAssetUrl(absUrl, '')).toBe(absUrl);
  });

  it('normalizes trailing slashes on API base and leading slashes on path', () => {
    const result1 = buildAssetUrl('api/health', `${TEST_MODAL_BASE}/`);
    expect(result1).toBe(`${TEST_MODAL_BASE}/api/health`);

    const result2 = buildAssetUrl('/api/health', `${TEST_MODAL_BASE}///`);
    expect(result2).toBe(`${TEST_MODAL_BASE}/api/health`);

    const result3 = buildAssetUrl('///api/health', TEST_MODAL_BASE);
    expect(result3).toBe(`${TEST_MODAL_BASE}/api/health`);
  });

  it('returns empty string for null, undefined, or empty path', () => {
    expect(buildAssetUrl(null, 'https://example.com')).toBe('');
    expect(buildAssetUrl(undefined, 'https://example.com')).toBe('');
    expect(buildAssetUrl('', 'https://example.com')).toBe('');
  });
});
