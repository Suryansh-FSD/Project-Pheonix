import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, resolveAssetUrl } from '../App';

describe('App', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok', backend_ready: true, model_ready: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('resolves relative asset URLs with VITE_API_BASE_URL prefix correctly', () => {
    const url = '/api/jobs/123/previews/lr_rgb.png';
    const resolved = resolveAssetUrl(url);
    expect(resolved).toBe('/api/jobs/123/previews/lr_rgb.png');

    const absolute = 'https://cdn.geosr.com/sample.tif';
    expect(resolveAssetUrl(absolute)).toBe(absolute);
  });

  it('renders application header and title accurately', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/GeoSR/i);
    expect(screen.getByText(/Upload Sentinel-2 GeoTIFF/i)).toBeInTheDocument();
  });
});
