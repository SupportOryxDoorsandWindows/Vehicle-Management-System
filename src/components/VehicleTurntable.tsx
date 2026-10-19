import { useState } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const ROUND_BUTTON =
  'w-12 h-12 rounded-full border border-oryx-field bg-white shadow-[0_2px_6px_rgba(2,42,58,0.12)] inline-flex items-center justify-center text-oryx-blue hover:bg-oryx-soft';

/**
 * The vehicle's photo on a turntable, swaying to give a sense of depth. It is one
 * photo turning, not a true 360° (that needs a photo set taken around the vehicle).
 */
export function VehicleTurntable({ src, alt }: { src: string; alt: string }) {
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  // Remounting the image restarts its animation from the front view.
  const [run, setRun] = useState(0);
  const playState = { animationPlayState: playing ? 'running' : 'paused' } as const;

  return (
    <section
      aria-label="360 degree vehicle view"
      className="flex-[1.25_1_480px] min-w-0 bg-gradient-to-b from-white to-oryx-soft border border-oryx-line rounded-[14px] p-6 flex flex-col items-center justify-center gap-[18px]"
    >
      <div className="relative w-full max-w-[640px] h-[260px] sm:h-[400px] flex items-end justify-center">
        <div
          aria-hidden="true"
          className="absolute left-[4%] right-[4%] bottom-[18px] h-[70px] sm:h-[110px] rounded-[50%] border-[1.5px] border-[#C9CFD3] bg-[radial-gradient(ellipse_at_center,#EEF1F2_0%,#F7F7F4_70%)]"
        />
        <div
          key={`shadow-${run}`}
          aria-hidden="true"
          className="oryx-shadow absolute left-[22%] right-[22%] bottom-[40px] sm:bottom-[52px] h-[30px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(2,42,58,0.28)_0%,rgba(2,42,58,0)_70%)]"
          style={playState}
        />
        <img
          key={`car-${run}`}
          src={src}
          alt={alt}
          className="oryx-turn relative mix-blend-multiply w-[92%] max-h-[220px] sm:max-h-[360px] object-contain mb-[44px] sm:mb-[56px]"
          style={playState}
        />
      </div>
      <div className="flex items-center justify-center gap-10 w-full">
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause rotation' : 'Resume rotation'}
          className={ROUND_BUTTON}
        >
          {playing ? (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5l12 7-12 7z" />
            </svg>
          )}
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <svg aria-hidden="true" width="120" height="44" viewBox="0 0 120 44" fill="none">
            <text x="60" y="27" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="26" fontWeight="700" fill="#022A3A">
              360°
            </text>
            <path d="M12 26c0 8 21 14 48 14s48-6 48-14" stroke="#022A3A" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M66 36l-6 4 6 4" stroke="#022A3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span role="status" className="text-[13px] text-oryx-muted">
            {playing ? 'Auto rotating…' : 'Paused'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setRun((n) => n + 1);
          }}
          aria-label="Reset to front view"
          className={ROUND_BUTTON}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
      </div>
    </section>
  );
}
