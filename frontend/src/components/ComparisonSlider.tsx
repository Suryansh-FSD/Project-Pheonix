import React, { useState, useRef, useCallback } from 'react';

interface ComparisonSliderProps {
  leftImageUrl: string;
  rightImageUrl: string;
  leftLabel?: string;
  rightLabel?: string;
  initialPosition?: number;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  leftImageUrl,
  rightImageUrl,
  leftLabel = 'Original (10m LR)',
  rightLabel = 'Super-Resolved (2.5m SR)',
  initialPosition = 50,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(initialPosition);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - 20));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + 20));
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square max-w-xl mx-auto rounded-xl overflow-hidden select-none border border-slate-800 bg-slate-950 shadow-2xl"
    >
      {/* Right Image (SR - Full background) */}
      <img
        src={rightImageUrl}
        alt={rightLabel}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Left Image (LR - Clipped overlay) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={leftImageUrl}
          alt={leftLabel}
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
        />
      </div>

      {/* Vertical Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-slate-900/90 border-2 border-emerald-400 rounded-full flex items-center justify-center shadow-md">
          <span className="text-[10px] font-bold text-emerald-400">↔</span>
        </div>
      </div>

      {/* Floating Labels */}
      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-xs font-medium text-slate-300 border border-slate-800">
        {leftLabel}
      </div>
      <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-xs font-medium text-emerald-400 border border-slate-800">
        {rightLabel}
      </div>

      {/* Accessible Native Range Slider Input */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={(e) => setSliderPosition(Number(e.target.value))}
        onKeyDown={handleKeyDown}
        aria-label="Comparison slider"
        aria-valuenow={sliderPosition}
        aria-valuemin={0}
        aria-valuemax={100}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 focus-visible:opacity-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500"
      />
    </div>
  );
};
