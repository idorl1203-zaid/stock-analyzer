'use client';
import { useEffect, useRef } from 'react';

export default function ThemeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate candlestick data
    const generateCandles = (count: number) => {
      const candles: { open: number; high: number; low: number; close: number }[] = [];
      let price = 0.45;
      for (let i = 0; i < count; i++) {
        const open = price;
        const change = (Math.random() - 0.48) * 0.06;
        const close = Math.max(0.1, Math.min(0.9, open + change));
        const high = Math.max(open, close) + Math.random() * 0.03;
        const low = Math.min(open, close) - Math.random() * 0.03;
        candles.push({ open, high: Math.min(0.95, high), low: Math.max(0.05, low), close });
        price = close;
      }
      return candles;
    };

    const candles = generateCandles(60);
    let offset = 0;

    // Grid lines data
    const gridLines = Array.from({ length: 8 }, (_, i) => (i + 1) / 9);

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      gridLines.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, H * y);
        ctx.lineTo(W, H * y);
        ctx.stroke();
      });

      // Vertical grid lines
      for (let i = 0; i < 12; i++) {
        const x = (W / 12) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // Draw a smooth price line in background
      const linePoints: { x: number; y: number }[] = [];
      const segW = W / 40;

      for (let i = 0; i < 42; i++) {
        const idx = (Math.floor(i + offset)) % candles.length;
        const c = candles[idx];
        const x = i * segW - (offset % 1) * segW;
        const y = H * (1 - c.close) * 0.7 + H * 0.15;
        linePoints.push({ x, y });
      }

      // Gradient fill under line
      if (linePoints.length > 1) {
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.10)');
        gradient.addColorStop(1, 'rgba(255, 46, 151, 0)');

        ctx.beginPath();
        ctx.moveTo(linePoints[0].x, H);
        ctx.lineTo(linePoints[0].x, linePoints[0].y);
        for (let i = 1; i < linePoints.length; i++) {
          const prev = linePoints[i - 1];
          const curr = linePoints[i];
          const mx = (prev.x + curr.x) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, mx, (prev.y + curr.y) / 2);
        }
        ctx.lineTo(linePoints[linePoints.length - 1].x, H);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw the line itself
        ctx.beginPath();
        ctx.moveTo(linePoints[0].x, linePoints[0].y);
        for (let i = 1; i < linePoints.length; i++) {
          const prev = linePoints[i - 1];
          const curr = linePoints[i];
          const mx = (prev.x + curr.x) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, mx, (prev.y + curr.y) / 2);
        }
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw candlesticks
      const candleW = Math.max(6, W / 80);
      const candleSpacing = W / 30;

      for (let i = 0; i < 32; i++) {
        const idx = (Math.floor(i + offset * 0.5)) % candles.length;
        const c = candles[idx];
        const x = i * candleSpacing - ((offset * 0.5) % 1) * candleSpacing;
        const isGreen = c.close >= c.open;

        const openY = H * (1 - c.open) * 0.6 + H * 0.2;
        const closeY = H * (1 - c.close) * 0.6 + H * 0.2;
        const highY = H * (1 - c.high) * 0.6 + H * 0.2;
        const lowY = H * (1 - c.low) * 0.6 + H * 0.2;

        const color = isGreen ? 'rgba(0, 255, 159, 0.14)' : 'rgba(255, 56, 100, 0.12)';
        const wickColor = isGreen ? 'rgba(0, 255, 159, 0.1)' : 'rgba(255, 56, 100, 0.1)';

        // Wick
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(2, Math.abs(closeY - openY));
        ctx.fillStyle = color;
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      }

      // Animate
      time += 0.005;
      offset += 0.008;

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
