import { useEffect, useRef } from 'react';
import { WeatherEffect } from '../../types/map';

export interface WeatherOverlayProps {
  weather: WeatherEffect;
  width: number;
  height: number;
  isMaster?: boolean;
}

// Particle interfaces
interface Raindrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  windX: number;
  alpha: number;
  splashY: number;
}

interface RainSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

interface Snowflake {
  baseX: number;
  x: number;
  y: number;
  radius: number;
  vy: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  wobblePhase: number;
  alpha: number;
}

interface FogPuff {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  pulsePhase: number;
  pulseSpeed: number;
}

interface Ember {
  baseX: number;
  x: number;
  y: number;
  radius: number;
  vy: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  wobblePhase: number;
  life: number;
  maxLife: number;
  color: string;
  flickerPhase: number;
  flickerSpeed: number;
}

const EMBER_COLORS = ['#FF3B00', '#FF6B00', '#FFAA00', '#FFD700', '#FFE680'];

export function WeatherOverlay({
  weather,
  width,
  height,
  isMaster = false,
}: WeatherOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (weather === 'none' || width <= 0 || height <= 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let isActive = true;

    // Calibrate opacity modifier for DM view vs Player view
    // Master view has slightly subtler opacity (0.8x) so tokens & grid remain crisp
    const opacityMod = isMaster ? 0.78 : 1.0;

    // ==========================================
    // 1. RAIN SYSTEM INITIALIZATION
    // ==========================================
    const rainCount = Math.floor(Math.min(220, Math.max(90, (width * height) / 8000)));
    const raindrops: Raindrop[] = [];
    const splashes: RainSplash[] = [];

    if (weather === 'rain') {
      for (let i = 0; i < rainCount; i++) {
        const speed = 19 + Math.random() * 12;
        raindrops.push({
          x: Math.random() * (width + 200) - 100,
          y: Math.random() * height - 50,
          length: 16 + Math.random() * 14,
          speed,
          windX: 3.5 + Math.random() * 2.5,
          alpha: 0.35 + Math.random() * 0.35,
          splashY: height * (0.35 + Math.random() * 0.65),
        });
      }
    }

    // ==========================================
    // 2. SNOW SYSTEM INITIALIZATION
    // ==========================================
    const snowCount = Math.floor(Math.min(150, Math.max(70, (width * height) / 12000)));
    const snowflakes: Snowflake[] = [];

    if (weather === 'snow') {
      for (let i = 0; i < snowCount; i++) {
        const baseX = Math.random() * width;
        snowflakes.push({
          baseX,
          x: baseX,
          y: Math.random() * height,
          radius: 1.2 + Math.random() * 2.8,
          vy: 0.8 + Math.random() * 1.5,
          wobbleSpeed: 0.015 + Math.random() * 0.025,
          wobbleAmp: 12 + Math.random() * 24,
          wobblePhase: Math.random() * Math.PI * 2,
          alpha: 0.4 + Math.random() * 0.5,
        });
      }
    }

    // ==========================================
    // 3. FOG SYSTEM INITIALIZATION
    // ==========================================
    const fogCount = Math.floor(Math.min(32, Math.max(16, (width * height) / 50000)));
    const fogPuffs: FogPuff[] = [];

    if (weather === 'fog') {
      for (let i = 0; i < fogCount; i++) {
        const radius = 160 + Math.random() * 160;
        fogPuffs.push({
          x: Math.random() * (width + radius * 2) - radius,
          y: Math.random() * (height + radius * 2) - radius,
          radius,
          vx: 0.25 + Math.random() * 0.45,
          vy: (Math.random() - 0.5) * 0.15,
          baseAlpha: isMaster ? 0.05 + Math.random() * 0.05 : 0.07 + Math.random() * 0.07,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.006 + Math.random() * 0.012,
        });
      }
    }

    // ==========================================
    // 4. EMBERS SYSTEM INITIALIZATION
    // ==========================================
    const emberCount = Math.floor(Math.min(110, Math.max(50, (width * height) / 14000)));
    const embers: Ember[] = [];

    if (weather === 'embers') {
      for (let i = 0; i < emberCount; i++) {
        const baseX = Math.random() * width;
        const maxLife = 140 + Math.floor(Math.random() * 140);
        embers.push({
          baseX,
          x: baseX,
          y: Math.random() * height,
          radius: 1.2 + Math.random() * 2.2,
          vy: -(1.4 + Math.random() * 2.4),
          wobbleSpeed: 0.025 + Math.random() * 0.045,
          wobbleAmp: 14 + Math.random() * 26,
          wobblePhase: Math.random() * Math.PI * 2,
          life: Math.floor(Math.random() * maxLife),
          maxLife,
          color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
          flickerPhase: Math.random() * Math.PI * 2,
          flickerSpeed: 0.12 + Math.random() * 0.18,
        });
      }
    }

    // ==========================================
    // ANIMATION RENDER LOOP (60 FPS)
    // ==========================================
    const render = () => {
      if (!isActive) return;

      ctx.clearRect(0, 0, width, height);

      // --- RAIN RENDER ---
      if (weather === 'rain') {
        // Draw and update raindrops
        ctx.lineWidth = 1.3;
        for (let i = 0; i < raindrops.length; i++) {
          const d = raindrops[i];
          d.x += d.windX;
          d.y += d.speed;

          // Rain streak
          ctx.strokeStyle = `rgba(185, 220, 255, ${d.alpha * opacityMod})`;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + (d.windX * d.length) / d.speed, d.y + d.length);
          ctx.stroke();

          // Check splash impact
          if (d.y >= d.splashY || d.y >= height) {
            if (splashes.length < 50 && Math.random() < 0.6) {
              splashes.push({
                x: d.x,
                y: Math.min(d.splashY, height - 2),
                radius: 1,
                maxRadius: 5 + Math.random() * 8,
                alpha: 0.55 * opacityMod,
                speed: 0.6 + Math.random() * 0.7,
              });
            }

            // Recycle raindrop to top
            d.y = -30 - Math.random() * 60;
            d.x = Math.random() * (width + 200) - 100;
            d.splashY = height * (0.35 + Math.random() * 0.65);
          }
        }

        // Draw and update splash ripples
        ctx.lineWidth = 1.0;
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.radius += s.speed;
          s.alpha = Math.max(0, 0.55 * (1 - s.radius / s.maxRadius) * opacityMod);

          if (s.alpha <= 0.01 || s.radius >= s.maxRadius) {
            splashes.splice(i, 1);
            continue;
          }

          ctx.strokeStyle = `rgba(200, 230, 255, ${s.alpha})`;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.radius, s.radius * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // --- SNOW RENDER ---
      else if (weather === 'snow') {
        for (let i = 0; i < snowflakes.length; i++) {
          const f = snowflakes[i];
          f.y += f.vy;
          f.wobblePhase += f.wobbleSpeed;
          f.x = f.baseX + Math.sin(f.wobblePhase) * f.wobbleAmp;

          // Recycle snowflake
          if (f.y > height + 10) {
            f.y = -10;
            f.baseX = Math.random() * width;
            f.x = f.baseX;
          }

          // Soft fluffy snowflake rendering
          if (f.radius > 2.4) {
            const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
            grad.addColorStop(0, `rgba(255, 255, 255, ${f.alpha * opacityMod})`);
            grad.addColorStop(0.6, `rgba(235, 245, 255, ${f.alpha * 0.6 * opacityMod})`);
            grad.addColorStop(1, 'rgba(235, 245, 255, 0)');
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = `rgba(240, 248, 255, ${f.alpha * opacityMod})`;
          }

          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- FOG RENDER ---
      else if (weather === 'fog') {
        for (let i = 0; i < fogPuffs.length; i++) {
          const p = fogPuffs[i];
          p.x += p.vx;
          p.y += p.vy;
          p.pulsePhase += p.pulseSpeed;

          // Wrap boundaries smoothly
          if (p.x - p.radius > width) p.x = -p.radius;
          if (p.y - p.radius > height) p.y = -p.radius;
          if (p.y + p.radius < 0) p.y = height + p.radius;

          const currentAlpha = p.baseAlpha * (0.8 + 0.25 * Math.sin(p.pulsePhase)) * opacityMod;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, `rgba(215, 225, 240, ${currentAlpha})`);
          grad.addColorStop(0.5, `rgba(195, 210, 225, ${currentAlpha * 0.5})`);
          grad.addColorStop(1, 'rgba(190, 205, 220, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- EMBERS RENDER ---
      else if (weather === 'embers') {
        for (let i = 0; i < embers.length; i++) {
          const e = embers[i];
          e.life++;
          e.y += e.vy;
          e.wobblePhase += e.wobbleSpeed;
          e.x = e.baseX + Math.sin(e.wobblePhase) * e.wobbleAmp;
          e.flickerPhase += e.flickerSpeed;

          // Recycle ember when life expires or reaches top
          if (e.life >= e.maxLife || e.y < -20) {
            e.life = 0;
            e.y = height + 10 + Math.random() * 30;
            e.baseX = Math.random() * width;
            e.x = e.baseX;
          }

          const progress = e.life / e.maxLife;
          const fadeInOut = progress < 0.15 ? progress / 0.15 : 1 - progress;
          const flicker = 0.75 + 0.25 * Math.sin(e.flickerPhase);
          const alpha = Math.max(0, Math.min(1, fadeInOut * flicker * opacityMod));

          // Glowing luminescent ember
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.shadowColor = e.color;
          ctx.shadowBlur = e.radius * 4;
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      isActive = false;
      cancelAnimationFrame(animFrameId);
    };
  }, [weather, width, height, isMaster]);

  if (weather === 'none' || width <= 0 || height <= 0) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
