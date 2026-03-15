"use client";

import { useEffect, useRef, useCallback } from "react";

interface ConfettiProps {
  trigger: boolean;
}

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e"];
const PARTICLE_COUNT = 65;

interface Particle {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  opacity: number;
}

export default function Confetti({ trigger }: ConfettiProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFiredRef = useRef(false);
  const prevTriggerRef = useRef(false);

  const fireConfetti = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles: Particle[] = [];
    const rect = { width: window.innerWidth, height: window.innerHeight };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const el = document.createElement("div");
      const size = 4 + Math.random() * 4;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const isCircle = Math.random() > 0.5;

      el.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${isCircle ? "50%" : "1px"};
        pointer-events: none;
        z-index: 9999;
        will-change: transform, opacity;
      `;

      container.appendChild(el);

      particles.push({
        el,
        x: Math.random() * rect.width,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        size,
        opacity: 1,
      });
    }

    const startTime = performance.now();
    const duration = 2200;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.12; // gravity
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vx *= 0.99; // air resistance

        // Fade out in last 30%
        if (progress > 0.7) {
          p.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
        }

        p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`;
        p.el.style.opacity = String(p.opacity);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Cleanup
        for (const p of particles) {
          p.el.remove();
        }
      }
    }

    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    // Fire only on rising edge (false -> true)
    if (trigger && !prevTriggerRef.current) {
      fireConfetti();
    }
    prevTriggerRef.current = trigger;
  }, [trigger, fireConfetti]);

  return <div ref={containerRef} className="pointer-events-none fixed inset-0 z-[9999]" />;
}
