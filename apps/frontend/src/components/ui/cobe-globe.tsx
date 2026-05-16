import React, { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';

interface GlobeProps {
  className?: string;
  dark?: number;
  markerColor?: [number, number, number];
  baseColor?: [number, number, number];
  arcColor?: [number, number, number];
  glowColor?: [number, number, number];
  mapBrightness?: number;
  speed?: number;
}

// Major global logistics hubs — no labels
const MARKERS = [
  { location: [51.9, 4.5] as [number, number] }, // Rotterdam
  { location: [50.1, 8.7] as [number, number] }, // Frankfurt
  { location: [53.6, 10.0] as [number, number] }, // Hamburg
  { location: [52.2, 21.0] as [number, number] }, // Warsaw
  { location: [45.5, 9.2] as [number, number] }, // Milan
  { location: [41.0, 28.9] as [number, number] }, // Istanbul
  { location: [55.8, 37.6] as [number, number] }, // Moscow
  { location: [25.2, 55.3] as [number, number] }, // Dubai
  { location: [30.1, 31.2] as [number, number] }, // Cairo
  { location: [19.1, 72.9] as [number, number] }, // Mumbai
  { location: [28.6, 77.2] as [number, number] }, // Delhi
  { location: [43.7, 87.3] as [number, number] }, // Ürümqi (Silk Road hub)
  { location: [31.2, 121.5] as [number, number] }, // Shanghai
  { location: [39.9, 116.4] as [number, number] }, // Beijing
  { location: [37.6, 127.0] as [number, number] }, // Seoul
  { location: [35.7, 139.7] as [number, number] }, // Tokyo
  { location: [22.3, 114.2] as [number, number] }, // Hong Kong
  { location: [1.4, 103.8] as [number, number] }, // Singapore
  { location: [13.8, 100.5] as [number, number] }, // Bangkok
  { location: [21.0, 105.8] as [number, number] }, // Hanoi
  { location: [-1.3, 36.8] as [number, number] }, // Nairobi
  { location: [-26.2, 28.0] as [number, number] }, // Johannesburg
  { location: [6.5, 3.4] as [number, number] }, // Lagos
  { location: [33.6, -7.6] as [number, number] }, // Casablanca
  { location: [40.7, -74.0] as [number, number] }, // New York
  { location: [41.9, -87.6] as [number, number] }, // Chicago
  { location: [34.1, -118.2] as [number, number] }, // Los Angeles
  { location: [25.8, -80.2] as [number, number] }, // Miami
  { location: [19.4, -99.1] as [number, number] }, // Mexico City
  { location: [4.7, -74.1] as [number, number] }, // Bogotá
  { location: [-23.5, -46.6] as [number, number] }, // São Paulo
  { location: [-33.9, 151.2] as [number, number] }, // Sydney
];

// Land-heavy logistics corridors
const ARCS = [
  // ── Europe internal ──────────────────────────────────────
  { from: [51.9, 4.5] as [number, number], to: [50.1, 8.7] as [number, number] }, // Rotterdam→Frankfurt
  { from: [50.1, 8.7] as [number, number], to: [45.5, 9.2] as [number, number] }, // Frankfurt→Milan
  { from: [50.1, 8.7] as [number, number], to: [52.2, 21.0] as [number, number] }, // Frankfurt→Warsaw
  { from: [53.6, 10.0] as [number, number], to: [52.2, 21.0] as [number, number] }, // Hamburg→Warsaw
  { from: [45.5, 9.2] as [number, number], to: [41.0, 28.9] as [number, number] }, // Milan→Istanbul

  // ── Europe → Middle East ────────────────────────────────
  { from: [52.2, 21.0] as [number, number], to: [55.8, 37.6] as [number, number] }, // Warsaw→Moscow
  { from: [41.0, 28.9] as [number, number], to: [25.2, 55.3] as [number, number] }, // Istanbul→Dubai
  { from: [41.0, 28.9] as [number, number], to: [30.1, 31.2] as [number, number] }, // Istanbul→Cairo
  { from: [30.1, 31.2] as [number, number], to: [25.2, 55.3] as [number, number] }, // Cairo→Dubai

  // ── Eurasian Silk Road ───────────────────────────────────
  { from: [55.8, 37.6] as [number, number], to: [43.7, 87.3] as [number, number] }, // Moscow→Ürümqi
  { from: [43.7, 87.3] as [number, number], to: [39.9, 116.4] as [number, number] }, // Ürümqi→Beijing
  { from: [43.7, 87.3] as [number, number], to: [28.6, 77.2] as [number, number] }, // Ürümqi→Delhi
  { from: [25.2, 55.3] as [number, number], to: [19.1, 72.9] as [number, number] }, // Dubai→Mumbai
  { from: [28.6, 77.2] as [number, number], to: [19.1, 72.9] as [number, number] }, // Delhi→Mumbai

  // ── South & Southeast Asia ──────────────────────────────
  { from: [19.1, 72.9] as [number, number], to: [13.8, 100.5] as [number, number] }, // Mumbai→Bangkok
  { from: [13.8, 100.5] as [number, number], to: [21.0, 105.8] as [number, number] }, // Bangkok→Hanoi
  { from: [21.0, 105.8] as [number, number], to: [22.3, 114.2] as [number, number] }, // Hanoi→Hong Kong
  { from: [22.3, 114.2] as [number, number], to: [31.2, 121.5] as [number, number] }, // HK→Shanghai
  { from: [1.4, 103.8] as [number, number], to: [13.8, 100.5] as [number, number] }, // Singapore→Bangkok

  // ── East Asia internal ───────────────────────────────────
  { from: [39.9, 116.4] as [number, number], to: [31.2, 121.5] as [number, number] }, // Beijing→Shanghai
  { from: [39.9, 116.4] as [number, number], to: [37.6, 127.0] as [number, number] }, // Beijing→Seoul
  { from: [31.2, 121.5] as [number, number], to: [35.7, 139.7] as [number, number] }, // Shanghai→Tokyo
  { from: [37.6, 127.0] as [number, number], to: [35.7, 139.7] as [number, number] }, // Seoul→Tokyo

  // ── Africa ──────────────────────────────────────────────
  { from: [30.1, 31.2] as [number, number], to: [6.5, 3.4] as [number, number] }, // Cairo→Lagos
  { from: [33.6, -7.6] as [number, number], to: [6.5, 3.4] as [number, number] }, // Casablanca→Lagos
  { from: [6.5, 3.4] as [number, number], to: [-1.3, 36.8] as [number, number] }, // Lagos→Nairobi
  { from: [-1.3, 36.8] as [number, number], to: [-26.2, 28.0] as [number, number] }, // Nairobi→Joburg
  { from: [30.1, 31.2] as [number, number], to: [-1.3, 36.8] as [number, number] }, // Cairo→Nairobi

  // ── Americas ────────────────────────────────────────────
  { from: [40.7, -74.0] as [number, number], to: [41.9, -87.6] as [number, number] }, // NYC→Chicago
  { from: [41.9, -87.6] as [number, number], to: [34.1, -118.2] as [number, number] }, // Chicago→LA
  { from: [34.1, -118.2] as [number, number], to: [19.4, -99.1] as [number, number] }, // LA→Mexico City
  { from: [25.8, -80.2] as [number, number], to: [19.4, -99.1] as [number, number] }, // Miami→Mexico City
  { from: [19.4, -99.1] as [number, number], to: [4.7, -74.1] as [number, number] }, // Mexico City→Bogotá
  { from: [4.7, -74.1] as [number, number], to: [-23.5, -46.6] as [number, number] }, // Bogotá→São Paulo
  { from: [40.7, -74.0] as [number, number], to: [25.8, -80.2] as [number, number] }, // NYC→Miami
];

export function CobeGlobe({
  className = '',
  dark = 0,
  markerColor = [0.3, 0.45, 0.85],
  baseColor = [1, 1, 1],
  arcColor = [0.3, 0.45, 0.85],
  glowColor = [0.88, 0.88, 0.88],
  mapBrightness = 8,
  speed = 0.004,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0 });
  const phiOffsetRef = useRef(0);
  const velocity = useRef(0);
  const lastPointer = useRef<{ x: number; t: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!pointerInteracting.current) return;
    const dx = e.clientX - pointerInteracting.current.x;
    dragOffset.current.phi = dx / 200;
    const now = Date.now();
    if (lastPointer.current) {
      const dt = Math.max(now - lastPointer.current.t, 1);
      velocity.current = Math.max(
        -0.12,
        Math.min(0.12, ((e.clientX - lastPointer.current.x) / dt) * 0.3),
      );
    }
    lastPointer.current = { x: e.clientX, t: now };
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current) {
      phiOffsetRef.current += dragOffset.current.phi;
      dragOffset.current.phi = 0;
      lastPointer.current = null;
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animId: number;
    let phi = 0;

    function init() {
      if (!canvas || globe) return;
      const w = canvas.offsetWidth;
      if (w === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: w * dpr,
        height: w * dpr,
        phi: 0,
        theta: 0.2,
        dark,
        diffuse: 1.4,
        mapSamples: 20000,
        mapBrightness,
        baseColor,
        markerColor,
        glowColor,
        markers: MARKERS.map((m) => ({ location: m.location, size: 0.02 })),
        arcs: ARCS.map((a, i) => ({ from: a.from, to: a.to, id: String(i) })),
        arcColor,
        arcWidth: 0.6,
        arcHeight: 0.2,
        opacity: 0.85,
      });

      function animate() {
        if (!pointerInteracting.current) {
          phi += speed;
          if (Math.abs(velocity.current) > 0.0001) {
            phiOffsetRef.current += velocity.current;
            velocity.current *= 0.95;
          }
        }
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2,
          dark,
          mapBrightness,
          baseColor,
          markerColor,
          arcColor,
          glowColor,
        });
        animId = requestAnimationFrame(animate);
      }
      animate();
      setTimeout(() => {
        if (canvas) canvas.style.opacity = '1';
      });
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if ((entries[0]?.contentRect.width ?? 0) > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    }

    return () => {
      cancelAnimationFrame(animId);
      globe?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark, mapBrightness]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1.2s ease',
          borderRadius: '50%',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
