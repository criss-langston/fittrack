"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[Global Error Boundary]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>FitTrack Pro — Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                background-color: #030712;
                color: #ffffff;
                font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                -webkit-font-smoothing: antialiased;
              }
              .center {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 1.5rem;
              }
              .icon-wrap {
                width: 4rem;
                height: 4rem;
                border-radius: 1rem;
                background: rgba(239,68,68,0.1);
                border: 1px solid rgba(239,68,68,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 1.5rem;
              }
              h1 { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: 0.5rem; }
              .subtitle { color: #9ca3af; font-size: 0.875rem; text-align: center; max-width: 20rem; margin-bottom: 1.5rem; }
              .actions { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; max-width: 20rem; }
              .btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; cursor: pointer; border: none; }
              .btn-primary { background: #8b5cf6; color: #fff; }
            `,
          }}
        />
      </head>
      <body>
        <div className="center">
          <div className="icon-wrap">
            <ShieldAlert size={32} color="#f87171" />
          </div>
          <h1>Critical Error</h1>
          <p className="subtitle">A critical error occurred that prevented the app from loading.</p>
          {process.env.NODE_ENV === "development" && error?.message && (
            <p style={{fontFamily:'monospace',fontSize:'0.75rem',color:'#fca5a5',marginBottom:'1.5rem',maxWidth:'24rem',wordBreak:'break-all'}}>{error.message}</p>
          )}
          {process.env.NODE_ENV !== "development" && error?.digest && (
            <p style={{fontSize:'0.75rem',color:'#4b5563',marginBottom:'1.5rem'}}>Reference: {error.digest}</p>
          )}
          <div className="actions">
            <button onClick={reset} className="btn btn-primary">
              <RefreshCw size={16} />
              Reload App
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
