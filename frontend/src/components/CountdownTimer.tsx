'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string | Date;
  onComplete?: () => void;
}

export default function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOver: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false });

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        if (onComplete) onComplete();
        return true; // Over
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isOver: false
      });
      return false; // Not over
    };

    // Initial check
    const isOverImmediately = calculateTime();
    if (isOverImmediately) return;

    const timer = setInterval(() => {
      const isOverNow = calculateTime();
      if (isOverNow) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft.isOver) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse-glow">
        ● Active Now
      </span>
    );
  }

  // Format parts to look nice (e.g. 02h 45m 09s)
  const formatNum = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 font-mono text-sm">
      <span className="text-amber-500 animate-pulse font-sans">⏳ Locked:</span>
      <div className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
        {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
        <span>{formatNum(timeLeft.hours)}h:</span>
        <span>{formatNum(timeLeft.minutes)}m:</span>
        <span className="text-amber-400">{formatNum(timeLeft.seconds)}s</span>
      </div>
    </div>
  );
}
