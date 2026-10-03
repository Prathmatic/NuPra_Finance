import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface InteractiveSplashProps {
  isAuthLoading?: boolean;
  onFinish: () => void;
  minDurationMs?: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const InteractiveSplash: React.FC<InteractiveSplashProps> = ({
  isAuthLoading = false,
  onFinish,
  minDurationMs = 2200,
}) => {
  const [phase, setPhase] = useState<'enter' | 'shine' | 'ready' | 'exit'>('enter');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing Vault...');
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [tapCount, setTapCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const minTimeReachedRef = useRef(false);
  const hasFinishedRef = useRef(false);

  // Trigger graceful exit
  const handleExit = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setPhase('exit');
    setTimeout(() => {
      onFinish();
    }, 400);
  }, [onFinish]);

  // Stage sequence and progress tracking
  useEffect(() => {
    const start = Date.now();
    startTimeRef.current = start;

    // Phase 1 -> Phase 2 (Shine)
    const tShine = setTimeout(() => {
      setPhase('shine');
      setStatusText('Synchronizing Shared Vault...');
    }, 600);

    // Smooth progress simulation
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (pct >= 50 && pct < 85) {
        setStatusText('Unlocking Couple Workspace...');
      } else if (pct >= 85) {
        setStatusText('Vault Ready · Welcome');
      }

      if (elapsed >= minDurationMs) {
        minTimeReachedRef.current = true;
        setPhase('ready');
        clearInterval(interval);
      }
    }, 50);

    return () => {
      clearTimeout(tShine);
      clearInterval(interval);
    };
  }, [minDurationMs]);

  // Auto-advance when ready & auth is loaded
  useEffect(() => {
    if (phase === 'ready' && !isAuthLoading && !hasFinishedRef.current) {
      const autoTimer = setTimeout(() => {
        handleExit();
      }, 700);
      return () => clearTimeout(autoTimer);
    }
  }, [phase, isAuthLoading, handleExit]);

  // Fire celebratory burst on center emblem
  const triggerConfetti = useCallback((originX?: number, originY?: number) => {
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { 
          x: originX !== undefined ? originX / window.innerWidth : 0.5, 
          y: originY !== undefined ? originY / window.innerHeight : 0.45 
        },
        colors: ['#f43f5e', '#818cf8', '#10b981', '#fbbf24', '#ffffff', '#38bdf8'],
        disableForReducedMotion: true,
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  // Handle tap anywhere on screen
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;

    if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    // Add ripple
    const newRipple: Ripple = { id: Date.now() + Math.random(), x: clientX, y: clientY };
    setRipples(prev => [...prev.slice(-4), newRipple]);

    setTapCount(c => c + 1);

    // If tapped and auth is ready, proceed immediately
    if (minTimeReachedRef.current && !isAuthLoading) {
      triggerConfetti(clientX, clientY);
      handleExit();
    } else if (phase !== 'enter') {
      triggerConfetti(clientX, clientY);
      // Accelerate progress
      setProgress(100);
      minTimeReachedRef.current = true;
      setPhase('ready');
      if (!isAuthLoading) {
        handleExit();
      }
    }
  };

  // Interactive 3D tilt tracking on mouse / pointer movement
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!emblemRef.current) return;
    const rect = emblemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
    const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);
    setTilt({
      x: Math.max(-15, Math.min(15, -deltaY * 20)),
      y: Math.max(-15, Math.min(15, deltaX * 20)),
    });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onClick={handleScreenClick}
      onTouchStart={handleScreenClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 bg-[#070a13] select-none overflow-hidden transition-all duration-400 ${
        phase === 'exit' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ isolation: 'isolate' }}
    >
      {/* Dynamic Touch Ripples */}
      {ripples.map(r => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none border border-emerald-400/40 animate-ping"
          style={{
            left: r.x - 30,
            top: r.y - 30,
            width: 60,
            height: 60,
            animationDuration: '800ms',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          }}
        />
      ))}

      {/* Atmospheric Background Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left Rose glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-rose-500/15 blur-[100px] animate-pulse" />
        {/* Bottom-right Indigo glow */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/15 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        {/* Center Emerald aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/20 blur-[80px]" />
      </div>

      {/* Top micro brand hint */}
      <div className="pt-safe-top w-full flex items-center justify-center opacity-70">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold tracking-wide">NuPra Secure Vault</span>
        </div>
      </div>

      {/* Center Stage: Hero "NP" Emblem with Radial Rings & Light Beams */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        {/* Radiant Expanding Pulse Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
          {/* Ring 1 */}
          <div 
            className="absolute w-36 h-36 rounded-full border border-emerald-400/30 animate-ping opacity-60"
            style={{ animationDuration: '2.4s' }}
          />
          {/* Ring 2 */}
          <div 
            className="absolute w-48 h-48 rounded-full border border-indigo-400/20 animate-ping opacity-40"
            style={{ animationDuration: '3s', animationDelay: '0.6s' }}
          />
          {/* Ring 3 */}
          <div 
            className="absolute w-64 h-64 rounded-full border border-rose-400/20 animate-ping opacity-25"
            style={{ animationDuration: '3.6s', animationDelay: '1.2s' }}
          />
        </div>

        {/* Interactive Tiltable NP Monogram Badge */}
        <div
          ref={emblemRef}
          style={{
            transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="relative group cursor-pointer"
        >
          {/* Outer Multi-color Rotating Border Glow */}
          <div className="absolute -inset-1.5 rounded-[32px] bg-gradient-to-tr from-emerald-400 via-indigo-500 to-rose-500 opacity-70 blur-md group-hover:opacity-100 transition-opacity animate-pulse-subtle" />

          {/* Main NP Badge Container */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] p-[2px] bg-gradient-to-br from-emerald-300/80 via-teal-400/50 to-indigo-500/80 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <div className="w-full h-full rounded-[26px] bg-slate-950/95 border border-white/15 flex items-center justify-center relative overflow-hidden">
              
              {/* Sweeping Light Sheen Animation */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer pointer-events-none" 
              />

              {/* Central Geometric "NP" Monogram */}
              <div className="flex items-center tracking-tighter font-black font-sans select-none text-4xl sm:text-5xl">
                {/* N - Silver White */}
                <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-md">
                  N
                </span>
                {/* P - Emerald to Indigo Couple Gradient */}
                <span className="bg-gradient-to-b from-emerald-300 via-teal-300 to-indigo-300 bg-clip-text text-transparent -ml-1 drop-shadow-md">
                  P
                </span>
              </div>

              {/* Status Jewel Indicator at bottom right */}
              <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className="mt-7 text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center gap-1">
            <span className="bg-gradient-to-r from-rose-400 via-pink-300 to-white bg-clip-text text-transparent">
              Nu
            </span>
            <span className="bg-gradient-to-r from-teal-300 via-indigo-300 to-indigo-400 bg-clip-text text-transparent">
              Pra
            </span>
            <span className="text-white ml-1">
              Finance
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Smart Couple Finance · Shared Wealth
          </p>

          {/* Couple Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-white/10 text-[11px] text-slate-300 shadow-sm mt-1">
            <Heart className="w-3 h-3 text-rose-400 fill-rose-400/30 animate-pulse" />
            <span>Nupur & Prathmesh</span>
            <Sparkles className="w-3 h-3 text-amber-400 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Bottom Controls / Progress & Interactive Prompt */}
      <div className="w-full max-w-xs space-y-3 pb-safe-bottom flex flex-col items-center">
        {/* Progress Line */}
        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-emerald-400 to-indigo-500 rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status text */}
        <div className="flex items-center justify-between w-full text-[11px] text-slate-400 font-medium px-1">
          <span className="truncate">{statusText}</span>
          <span className="font-bold text-slate-300">{progress}%</span>
        </div>

        {/* Interactive Action Prompt */}
        <div className="pt-2 w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerConfetti();
              handleExit();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600/80 via-emerald-600/80 to-indigo-600/80 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-black/40 flex items-center justify-center gap-2 border border-white/20 active:scale-98 transition-all group"
          >
            <span>{phase === 'ready' && !isAuthLoading ? 'Enter NuPra' : 'Tap to Skip'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {tapCount > 0 && (
          <p className="text-[10px] text-slate-500 animate-fade-in">
            {tapCount} sparkle{tapCount === 1 ? '' : 's'} launched ✨
          </p>
        )}
      </div>
    </div>
  );
};
