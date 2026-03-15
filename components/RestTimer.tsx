"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Timer, X, SkipForward } from "lucide-react";

interface RestTimerProps {
  show: boolean;
  onClose: () => void;
  autoStartSeconds?: number;
}

const QUICK_TIMES = [30, 60, 90, 120];
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RestTimer({ show, onClose, autoStartSeconds }: RestTimerProps) {
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

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    playTone();

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

  useEffect(() => {
    if (autoStartSeconds && autoStartSeconds > 0 && show) {
      startTimer(autoStartSeconds);
    }
  }, [autoStartSeconds, show, startTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const handleSkip = () => {
    clearTimer();
    setIsRunning(false);
    setIsFinished(false);
    setRemaining(0);
    onClose();
  };

  const handleQuickSet = (seconds: number) => {
    startTimer(seconds);
  };

  if (!show && !isRunning) return null;

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-violet-400" />
          <span className="text-sm font-medium text-white">
            {isFinished ? "Rest Complete!" : isRunning ? "Resting..." : "Rest Timer"}
          </span>
        </div>
        <button onClick={handleSkip} className="text-gray-500 hover:text-gray-300 p-1">
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="88" height="88" className="-rotate-90">
            <circle
              cx="44"
              cy="44"
              r={RADIUS}
              fill="none"
              stroke="#1f2937"
              strokeWidth="5"
            />
            <circle
              cx="44"
              cy="44"
              r={RADIUS}
              fill="none"
              stroke={isFinished ? "#10b981" : "#8b5cf6"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={isFinished ? 0 : dashOffset}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${isFinished ? "text-green-400" : "text-white"}`}>
              {isFinished ? "Done" : formatTime(remaining)}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {!isRunning && !isFinished && (
            <div className="grid grid-cols-4 gap-1.5">
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

          {isRunning && (
            <button
              onClick={handleSkip}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg py-2 transition-colors"
            >
              <SkipForward size={14} />
              Skip Rest
            </button>
          )}

          {isFinished && (
            <div className="text-center">
              <p className="text-green-400 text-sm font-medium">Time to lift!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
