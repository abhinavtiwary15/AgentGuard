import React, { useEffect, useRef } from 'react';

interface ThreatSource {
  name: string;
  x: number; // percentage of width (0 to 1)
  y: number; // percentage of height (0 to 1)
  color: string;
  type: string;
  speed: number;
}

const SOURCES: ThreatSource[] = [
  { name: 'Moscow', x: 0.35, y: 0.28, color: '#CF1322', type: 'SQL Injection', speed: 0.007 },
  { name: 'Beijing', x: 0.72, y: 0.38, color: '#D46B08', type: 'Brute Force', speed: 0.005 },
  { name: 'Pyongyang', x: 0.82, y: 0.42, color: '#7C5A00', type: 'Port Scan', speed: 0.009 },
  { name: 'St. Petersburg', x: 0.42, y: 0.22, color: '#CF1322', type: 'DDoS Origin', speed: 0.006 },
];

export const GlobePanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width;
    let height = canvas.height;

    // Track particles along bezier paths
    const particles = SOURCES.map((src) => ({
      ...src,
      t: Math.random(), // start at random progress to avoid sync
    }));

    // Handle high DPI displays
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      width = canvas.width;
      height = canvas.height;
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      // 1. Clear with deep premium dark background
      ctx.fillStyle = '#141312';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw subtle global grid system (latitude/longitude lines)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const centerX = width * 0.5;
      const centerY = height * 0.55;
      const radius = Math.min(width, height) * 0.45;

      // Draw concentric rings
      for (let r = 50; r <= radius; r += 50) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw meridian lines
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius
        );
        ctx.stroke();
      }

      // 3. Define corporate target node (HQ in London / Center)
      const hqX = width * 0.5;
      const hqY = height * 0.58;

      // Draw HQ outer glow
      const hqPulse = 12 + Math.sin(Date.now() / 150) * 3;
      const hqGrad = ctx.createRadialGradient(hqX, hqY, 2, hqX, hqY, hqPulse);
      hqGrad.addColorStop(0, 'rgba(35, 120, 4, 0.4)');
      hqGrad.addColorStop(1, 'rgba(35, 120, 4, 0)');
      ctx.fillStyle = hqGrad;
      ctx.beginPath();
      ctx.arc(hqX, hqY, hqPulse, 0, Math.PI * 2);
      ctx.fill();

      // Draw HQ center dot (green - active)
      ctx.fillStyle = '#237804';
      ctx.beginPath();
      ctx.arc(hqX, hqY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label HQ
      ctx.fillStyle = '#8A8480';
      ctx.font = `600 ${Math.max(10, width * 0.025)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('CORP-NET HQ', hqX, hqY + 18);

      // 4. Draw Threat Sources and Vectors
      particles.forEach((p) => {
        const srcX = width * p.x;
        const srcY = height * p.y;

        // Draw threat origin dot
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(srcX, srcY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing ring around threat source
        const pulse = 4 + (Math.sin(Date.now() / 100 + p.x * 100) * 2 + 2);
        ctx.strokeStyle = p.color + '40'; // low opacity hex
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(srcX, srcY, pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Draw origin label
        ctx.fillStyle = '#E9E8E5';
        ctx.font = `500 ${Math.max(9, width * 0.022)}px "Geist", sans-serif`;
        ctx.textAlign = srcX < hqX ? 'right' : 'left';
        ctx.fillText(p.name.toUpperCase(), srcX + (srcX < hqX ? -8 : 8), srcY + 3);

        // Control point for arc (bend upwards)
        const ctrlX = (srcX + hqX) * 0.5;
        const ctrlY = Math.min(srcY, hqY) - 50;

        // Draw threat vector path arc (curved dashed line)
        ctx.strokeStyle = 'rgba(207, 19, 34, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(srcX, srcY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, hqX, hqY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // 5. Update and Draw Particle along the Bezier curve
        p.t += p.speed;
        if (p.t > 1) {
          p.t = 0; // Loop particle
        }

        // Quadratic bezier equation: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const t = p.t;
        const mt = 1 - t;
        const px = mt * mt * srcX + 2 * mt * t * ctrlX + t * t * hqX;
        const py = mt * mt * srcY + 2 * mt * t * ctrlY + t * t * hqY;

        // Draw particle trail
        const pGrad = ctx.createRadialGradient(px, py, 1, px, py, 6);
        pGrad.addColorStop(0, p.color);
        pGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm h-full w-full relative overflow-hidden flex flex-col el-2">
      <div className="px-4 py-3 border-b border-border-subtle shrink-0">
        <h3 className="section-title">Global Threat Vectors</h3>
      </div>
      <div className="flex-1 relative bg-[#141312]">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};
