"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface HalftoneWaveProps {
  className?: string;
  dotSpacing?: number;
  maxRadius?: number;
  speed?: number;
  waveFrequency?: number;
  interactive?: boolean;
}

export function HalftoneWave({
  className = "",
  dotSpacing = 22,
  maxRadius = 3.5,
  speed = 0.02,
  waveFrequency = 0.035,
  interactive = true,
}: HalftoneWaveProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const updateTheme = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(isDark);
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateTheme);
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 120,
    };

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const onResize = () => {
      handleResize();
      if (reducedMotion) {
        render();
      }
    };

    handleResize();
    window.addEventListener("resize", onResize);
    if (interactive) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    let time = 0;

    const render = () => {
      time += speed;
      ctx.clearRect(0, 0, width, height);

      // Router7 palette: Matching UI/UX Red (Light #7A3430 / Dark #C85046)
      const dotColorRgb = isDarkMode ? "200, 80, 70" : "122, 52, 48";
      const cols = Math.ceil(width / dotSpacing) + 1;
      const rows = Math.ceil(height / dotSpacing) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * dotSpacing;
          const y = j * dotSpacing;

          // Procedural wave equation
          const wave1 = Math.sin(x * waveFrequency + time) * 0.5 + 0.5;
          const wave2 = Math.cos(y * waveFrequency + time * 0.8) * 0.5 + 0.5;
          const wave3 = Math.sin((x + y) * waveFrequency * 0.6 + time * 1.2) * 0.5 + 0.5;
          let intensity = (wave1 + wave2 + wave3) / 3;

          // Interactive mouse distortion
          if (interactive && mouse.x > 0) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouse.radius) {
              const mouseFactor = (1 - dist / mouse.radius);
              intensity = Math.min(1, intensity + mouseFactor * 0.6);
            }
          }

          const radius = Math.max(0.5, intensity * maxRadius);
          const alpha = isDarkMode
            ? Math.min(0.7, 0.15 + intensity * 0.45)
            : Math.min(0.65, 0.12 + intensity * 0.4);

          ctx.fillStyle = `rgba(${dotColorRgb}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!document.hidden && !reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!reducedMotion) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      if (!reducedMotion && !document.hidden) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotionQuery.addEventListener("change", onMotionChange);

    // Initial render
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotionQuery.removeEventListener("change", onMotionChange);
      window.removeEventListener("resize", onResize);
      if (interactive) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [dotSpacing, maxRadius, speed, waveFrequency, interactive, isDarkMode]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden select-none", className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block pointer-events-auto" />
    </div>
  );
}

export default HalftoneWave;
