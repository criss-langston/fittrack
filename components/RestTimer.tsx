"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Timer, X, SkipForward } from "lucide-react";

interface RestTimerProps {
  isVisible: boolean;
  onDismiss: () => void;
  autoStartSeconds?: number;
}

const QUICK_TIMES = [30, 60, 90, 120];
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RestTimer({ isVisible, onDismiss, autoStartSeconds }: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const playTone = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not available
    }
  }, []);

  const finishTimer = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsFinished(true);
    setRemaining(0);

    // Vibrate
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    playTone();

    // Auto-dismiss after 3s
    setTimeout(() => {
      setIsFinished(false);
    }, 3000);
  }, [clearTimer, playTone]);

  const startTimer = useCallback((seconds: number) => {
    clearTimer();
    setTotalSeconds(seconds);
    setRemaining(seconds);
    setIsRunning(true);
    setIsFinished(false);

    const startTime = Date.now();
    const endTime = startTime + seconds * 1000;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTime - now) / 1000));
      setRemaining(left);
      if (left <= 0) {
        finishTimer();
      }
    }, 100);
  }, [clearTimer, finishTimer]);

  // Auto-start when triggered externally
  useEffect(() => {
    if (autoStartSeconds && autoStartSeconds > 0 && isVisible) {
      startTimer(autoStartSeconds);
    }
  }, [autoStartSeconds, isVisible, startTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const handleSkip = () => {
    clearTimer();
    setIsRunning(false);
    setIsFinished(false);
    setRemaining(0);
    onDismiss();
  };

  const handleQuickSet = (seconds: number) => {
    startTimer(seconds);
  };

  if (!isVisible && !isRunning) return null;

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-gray-900 rounded-2xl shadow-lg shadow-violet-600/20 border border-gray-800 p-4 w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-gray-200">
              {isFinished ? "Rest Complete!" : isRunning ? "Resting..." : "Rest Timer"}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* SVG Circular Timer */}
          <div className="relative flex-shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88">
              {/* Background circle */}
              <circle
                cx="44"
                cy="44"
                r={RADIUS}
                fill="none"
                stroke="#1f2937"
                strokeWidth="5"
              />
              {/* Progress circle */}
              <circle
                cx="44"
                cy="44"
                r={RADIUS}
                fill="none"
                stroke={isFinished ? "#22c55e" : "#7c3aed"}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 44 44)"
                className="transition-all duration-200"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${
                isFinished ? "text-green-400" : remaining <= 5 && isRunning ? "text-red-400" : "text-white"
              }`}>
                {isFinished ? "Done" : formatTime(remaining)}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {/* Quick-set buttons */}
            {!isRunning && !isFinished && (
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_TIMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleQuickSet(t)}
                    className={`text-xs font-medium py-2 px-2 rounded-lg transition-colors ${
                      totalSeconds === t && !isRunning
                        ? "bg-violet-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {t >= 60 ? `${t / 60}m` : `${t}s`}
                    {t < 60 ? "" : t % 60 > 0 ? ` ${t % 60}s` : ""}
                  </button>
                ))}
              </div>
            )}

            {/* Skip button when running */}
            {isRunning && (
              <button
                onClick={handleSkip}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <SkipForward size={14} />
                Skip Rest
              </button>
            )}

            {/* Finished state */}
            {isFinished && (
              <p className="text-xs text-green-400 text-center font-medium">
                Time to lift!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
