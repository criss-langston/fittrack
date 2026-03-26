"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[Error Boundary]", error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-gray-950 text-white animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <AlertTriangle size={32} className="text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-2">Something went wrong</h1>
      <p className="text-gray-400 text-center text-sm mb-2 max-w-xs">
        An unexpected error occurred while loading this page.
      </p>
      {process.env.NODE_ENV === "development" && error?.message && (
        <div className="w-full max-w-sm mb-6 rounded-xl bg-gray-800 border border-gray-700 p-3">
          <p className="text-xs font-mono text-red-300 break-words">{error.message}</p>
          {error.digest && (
            <p className="text-xs text-gray-500 mt-1">Digest: {error.digest}</p>
          )}
        </div>
      )}
      {process.env.NODE_ENV !== "development" && error?.digest && (
        <p className="text-xs text-gray-600 mb-6">Reference: {error.digest}</p>
      )}
      {!error?.message && !error?.digest && <div className="mb-6" />}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="btn-primary flex items-center justify-center gap-2 w-full"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
        <Link
          href="/"
          className="btn-secondary flex items-center justify-center gap-2 w-full text-center"
        >
          <Home size={16} />
          Go Home
        </Link>
      </div>
    </div>
  );
}
