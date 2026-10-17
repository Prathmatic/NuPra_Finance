import React, { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number; // total animation time in ms
  isReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete, 
  duration = 2400,
  isReady = true 
}) => {
  const [phase, setPhase] = useState<'logo' | 'text' | 'tagline' | 'exit'>('logo');
  const [percentage, setPercentage] = useState(0);
  const [syncMessage, setSyncMessage] = useState('Initializing secure workspace...');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;

  useEffect(() => {
    // Stage transitions
    const t1 = setTimeout(() => setPhase('text'), 350);
    const t2 = setTimeout(() => setPhase('tagline'), 850);

    // Smooth percentage progress ticker starting immediately from 0 to 100%
    const intervalTime = 25;
    const activeTime = duration - 450;
    const totalSteps = Math.max(10, Math.floor(activeTime / intervalTime));
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const targetPct = Math.round((step / totalSteps) * 100);
      // If auth is still loading, cap at 98% until ready
      const currentPct = isReadyRef.current ? Math.min(100, targetPct) : Math.min(98, targetPct);
      setPercentage(currentPct);

      if (currentPct < 25) {
        setSyncMessage('Initializing secure workspace...');
      } else if (currentPct < 55) {
        setSyncMessage('Synchronizing couple vault data...');
      } else if (currentPct < 85) {
        setSyncMessage('Loading budgets, bills & goals...');
      } else if (currentPct < 100) {
        setSyncMessage('Finalizing encrypted session...');
      } else {
        setSyncMessage('Vault synchronized!');
      }

      if (currentPct >= 100 && isReadyRef.current) {
        clearInterval(interval);
        setTimeout(() => setPhase('exit'), 200);
        setTimeout(() => onCompleteRef.current(), 550);
      }
    }, intervalTime);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [duration]);

  const isVisible = phase !== 'exit';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 select-none ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ background: 'linear-gradient(145deg, #070a13 0%, #0b1023 40%, #0d0f24 70%, #070a13 100%)' }}
    >
      {/* Ambient glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[300px] h-[300px] rounded-full blur-[120px] animate-pulse"
          style={{ top: '20%', left: '10%', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }}
        />
        <div
          className="absolute w-[350px] h-[350px] rounded-full blur-[140px] animate-pulse"
          style={{ top: '40%', right: '5%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', animationDelay: '0.3s' }}
        />
        <div
          className="absolute w-[200px] h-[200px] rounded-full blur-[100px] animate-pulse"
          style={{ bottom: '15%', left: '30%', background: 'radial-gradient(circle, rgba(244,63,94,0.1) 0%, transparent 70%)', animationDelay: '0.6s' }}
        />
      </div>

      {/* Particle field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-[2px] h-[2px] rounded-full bg-white/20"
            style={{
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              animation: `splash-float ${3 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i % 3) * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-xs px-4">
        {/* NP Monogram with cinematic reveal */}
        <div
          className={`transition-all duration-700 ease-out ${
            phase === 'logo'
              ? 'scale-[1.3] opacity-0'
              : 'scale-100 opacity-100'
          }`}
        >
          <div className="relative">
            {/* Outer ring glow */}
            <div
              className="absolute inset-[-10px] rounded-[30px] animate-spin"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, #10b981 25%, transparent 50%, #6366f1 75%, transparent 100%)',
                opacity: 0.35,
                animationDuration: '4s',
                filter: 'blur(8px)',
              }}
            />

            {/* Main monogram container */}
            <div className="relative w-24 h-24 p-[2px] bg-gradient-to-br from-emerald-400/80 via-teal-500/40 to-indigo-500/80 rounded-[26px] shadow-2xl shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950/95 rounded-[24px] flex items-center justify-center relative overflow-hidden border border-white/10">
                {/* Metallic sheen sweep */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none"
                  style={{
                    animation: 'splash-sheen 2.5s ease-in-out infinite',
                  }}
                />

                {/* The NP letters */}
                <div className="flex items-center font-black text-[38px] tracking-[-2.5px] leading-none select-none">
                  <span
                    className="bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-md"
                    style={{
                      animation: 'splash-letter-n 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    }}
                  >
                    N
                  </span>
                  <span
                    className="bg-gradient-to-b from-emerald-300 via-teal-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-md -ml-1"
                    style={{
                      animation: 'splash-letter-p 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards',
                    }}
                  >
                    P
                  </span>
                </div>

                {/* Micro jewel */}
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/60 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* App Name */}
        <div
          className={`transition-all duration-600 ease-out ${
            phase === 'logo'
              ? 'opacity-0 translate-y-6'
              : phase === 'text' || phase === 'tagline'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-[-6px]'
          }`}
        >
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight text-center"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            NuPra Finance
          </h1>
        </div>

        {/* Tagline */}
        <div
          className={`transition-all duration-600 ease-out delay-75 ${
            phase === 'tagline'
              ? 'opacity-100 translate-y-0'
              : phase === 'exit'
              ? 'opacity-0 translate-y-[-6px]'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-xs text-slate-400 font-medium tracking-wide text-center">
            Couple Finance Tracking
          </p>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-emerald-500/50" />
            <span className="text-[9px] text-emerald-400/90 font-semibold tracking-widest uppercase">
              Smart · Shared · Secure
            </span>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-indigo-500/50" />
          </div>
        </div>

        {/* Live Synchronizing Bar with Percentage Display */}
        <div
          className={`w-full max-w-[240px] mt-2 space-y-2 transition-opacity duration-300 ${
            phase === 'exit' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 truncate font-medium text-[10px]">
              {syncMessage}
            </span>
            <span className="text-emerald-400 font-black tracking-wide ml-2 shrink-0">
              {percentage}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-900 border border-white/10 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-100 ease-out relative"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full blur-[1px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes splash-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-15px) scale(1.4); opacity: 0.5; }
        }
        @keyframes splash-sheen {
          0% { opacity: 0.08; transform: translateX(-100%) rotate(-45deg); }
          50% { opacity: 0.22; transform: translateX(100%) rotate(-45deg); }
          100% { opacity: 0.08; transform: translateX(-100%) rotate(-45deg); }
        }
        @keyframes splash-letter-n {
          from { opacity: 0; transform: translateY(14px) scale(0.85); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splash-letter-p {
          from { opacity: 0; transform: translateY(14px) scale(0.85); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
