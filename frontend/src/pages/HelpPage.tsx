import React from 'react';
import { HelpCircle, Check, FileCheck, ShieldAlert } from 'lucide-react';

export const HelpPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A] flex items-center gap-2.5">
          <HelpCircle className="w-7 h-7 text-[#00613E]" />
          Help & Technical Documentation
        </h1>
        <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
          Specifications, input constraints, and troubleshooting guidelines for Project Pheonix.
        </p>
      </div>

      {/* Quickstart Step Guide */}
      <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
        <h2 className="font-display text-base font-bold text-[#0D241A]">
          Quickstart Workflow
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2] space-y-1">
            <span className="w-5 h-5 rounded-full bg-[#00613E] text-white flex items-center justify-center text-[10px] font-bold">1</span>
            <strong className="text-[#0D241A] block">Upload GeoTIFF</strong>
            <p className="text-[11px] text-[#6D756F]">Select a 4-band 128×128 Sentinel-2 raster at 10 m resolution.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2] space-y-1">
            <span className="w-5 h-5 rounded-full bg-[#00613E] text-white flex items-center justify-center text-[10px] font-bold">2</span>
            <strong className="text-[#0D241A] block">Live 4× Enhancement</strong>
            <p className="text-[11px] text-[#6D756F]">Click Enhance Image to run ESA SEN2SRLite NonReference super-resolution.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2] space-y-1">
            <span className="w-5 h-5 rounded-full bg-[#00613E] text-white flex items-center justify-center text-[10px] font-bold">3</span>
            <strong className="text-[#0D241A] block">Compare & Analyze</strong>
            <p className="text-[11px] text-[#6D756F]">Drag the slider to inspect before (10 m) and after (2.5 m) visual details.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2] space-y-1">
            <span className="w-5 h-5 rounded-full bg-[#00613E] text-white flex items-center justify-center text-[10px] font-bold">4</span>
            <strong className="text-[#0D241A] block">Export 2.5 m GeoTIFF</strong>
            <p className="text-[11px] text-[#6D756F]">Download the georeferenced 512×512 GeoTIFF for QGIS/GIS pipelines.</p>
          </div>
        </div>
      </section>

      {/* Input Specifications */}
      <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-[#00613E]" />
          <h2 className="font-display text-base font-bold text-[#0D241A]">
            Strict Input Specifications
          </h2>
        </div>

        <ul className="space-y-2 text-xs text-[#0D241A]">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#16744A] shrink-0 mt-0.5" />
            <span><strong>Dimensions:</strong> Exactly 128×128 pixels. Larger or smaller rasters will return an <code>INVALID_DIMENSIONS</code> error.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#16744A] shrink-0 mt-0.5" />
            <span><strong>Band Count & Order:</strong> Exactly 4 bands in <code>B04 (Red), B03 (Green), B02 (Blue), B08 (NIR)</code> order.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#16744A] shrink-0 mt-0.5" />
            <span><strong>Ground Sampling Distance:</strong> 10 m per pixel.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#16744A] shrink-0 mt-0.5" />
            <span><strong>Coordinate System:</strong> Projected CRS (e.g. UTM / EPSG:32630) with non-degenerate affine transform.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#16744A] shrink-0 mt-0.5" />
            <span><strong>File Limit:</strong> Up to 50 MB maximum upload size.</span>
          </li>
        </ul>
      </section>

      {/* Scientific FAQs */}
      <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#00613E]" />
          <h2 className="font-display text-base font-bold text-[#0D241A]">
            Scientific Policy FAQs
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2] space-y-1">
            <strong className="text-[#0D241A] block">Why does my upload say &ldquo;Reference unavailable&rdquo;?</strong>
            <p className="text-[#6D756F]">
              Scientific metrics like PSNR and SSIM require an aligned sub-meter aerial ground-truth reference image. For arbitrary user uploads, no such reference exists, so Project Pheonix honestly displays &ldquo;Reference unavailable&rdquo; rather than displaying fabricated scores.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2] space-y-1">
            <strong className="text-[#0D241A] block">How does Cloudflare Quick Tunnel work?</strong>
            <p className="text-[#6D756F]">
              The public backend URL is proxied via Cloudflare Tunnel from the local Mac workstation. The URL remains active as long as the host terminal process stays awake.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
