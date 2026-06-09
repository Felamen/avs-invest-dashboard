"use client";

import { useMemo } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  twinkle: boolean;
};

type BrightStar = {
  x: number;
  y: number;
  size: number;
  delay: number;
};

type ShootingStar = {
  startX: number;
  startY: number;
  angle: number;
  delay: number;
  duration: number;
};

type Props = {
  /** Total stars rendered. ~220 looks dense without lag. */
  starCount?: number;
  /** Number of those stars that should twinkle. ~30 keeps GPU happy. */
  twinkleCount?: number;
  /** Number of "hero" bright stars with glow. ~6. */
  brightCount?: number;
  /** Number of shooting stars across the scene. ~3. */
  shootingCount?: number;
  /** Optional seed for deterministic rendering. */
  seed?: number;
  /** Brand colors for the three drifting gradient blobs. */
  blobs?: string[];
};

function seedRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export default function LoginBackground({
  starCount = 220,
  twinkleCount = 35,
  brightCount = 6,
  shootingCount = 3,
  seed = 1742,
  blobs = ["#10b981", "#0DB39E", "#0A6F76"],
}: Props) {
  const { stars, brightStars, shootingStars } = useMemo(() => {
    const rand = seedRandom(seed);
    const stars: Star[] = Array.from({ length: starCount }, (_, i) => ({
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 2 + 0.4,
      delay: rand() * 8,
      duration: rand() * 5 + 3,
      opacity: rand() * 0.7 + 0.25,
      twinkle: i < twinkleCount,
    }));
    const brightStars: BrightStar[] = Array.from({ length: brightCount }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 1.5 + 1.2,
      delay: rand() * 6,
    }));
    const shootingStars: ShootingStar[] = Array.from({ length: shootingCount }, (_, i) => ({
      startX: rand() * 100,
      startY: rand() * 50,
      angle: 20 + rand() * 20, // 20-40deg downward-right
      delay: i * 6 + rand() * 4, // stagger
      duration: 1.5 + rand() * 1.5,
    }));
    return { stars, brightStars, shootingStars };
  }, [starCount, twinkleCount, brightCount, shootingCount, seed]);

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ contain: "strict" }}
    >
      {/* drifting blurred gradient blobs */}
      <div
        className="absolute rounded-full opacity-30 blur-2xl avs-blob"
        style={{
          width: "45%",
          aspectRatio: "1",
          top: "-10%",
          left: "-10%",
          background: `radial-gradient(circle, ${blobs[0]} 0%, transparent 70%)`,
          animation: "avs-blob-drift-a 22s ease-in-out infinite",
          willChange: "transform",
        }}
      />
      <div
        className="absolute rounded-full opacity-25 blur-2xl avs-blob"
        style={{
          width: "40%",
          aspectRatio: "1",
          bottom: "-15%",
          right: "-5%",
          background: `radial-gradient(circle, ${blobs[1]} 0%, transparent 70%)`,
          animation: "avs-blob-drift-b 26s ease-in-out infinite",
          willChange: "transform",
        }}
      />
      <div
        className="absolute rounded-full opacity-20 blur-2xl avs-blob"
        style={{
          width: "35%",
          aspectRatio: "1",
          top: "40%",
          left: "40%",
          background: `radial-gradient(circle, ${blobs[2]} 0%, transparent 70%)`,
          animation: "avs-blob-drift-c 30s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* faint grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 100%)",
        }}
      />

      {/* starfield + bright stars + shooting stars */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="avs-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="avs-shoot" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="80%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* static stars (no animation, very light) */}
        {stars
          .filter((s) => !s.twinkle)
          .map((s, i) => (
            <circle
              key={`s-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.size * 0.12}
              fill="#ffffff"
              opacity={s.opacity}
            />
          ))}

        {/* twinkling stars (animated subset) */}
        {stars
          .filter((s) => s.twinkle)
          .map((s, i) => (
            <circle
              key={`t-${i}`}
              className="avs-star"
              cx={s.x}
              cy={s.y}
              r={s.size * 0.15}
              fill="#ffffff"
              style={{
                opacity: s.opacity,
                animation: `avs-star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                transformOrigin: `${s.x}% ${s.y}%`,
              }}
            />
          ))}

        {/* bright "hero" stars with glow */}
        {brightStars.map((b, i) => (
          <g key={`b-${i}`} filter="url(#avs-glow)">
            <circle
              className="avs-star"
              cx={b.x}
              cy={b.y}
              r={b.size * 0.18}
              fill="#ffffff"
              style={{
                animation: `avs-star-pulse 5s ease-in-out ${b.delay}s infinite`,
                transformOrigin: `${b.x}% ${b.y}%`,
              }}
            />
          </g>
        ))}

        {/* shooting stars */}
        {shootingStars.map((sh, i) => (
          <g
            key={`sh-${i}`}
            className="avs-shooting"
            style={{
              transformOrigin: `${sh.startX}% ${sh.startY}%`,
              animation: `avs-shoot ${sh.duration}s ease-out ${sh.delay}s infinite`,
              opacity: 0,
              ["--shoot-rot" as string]: `${sh.angle}deg`,
            }}
          >
            <line
              x1={sh.startX}
              y1={sh.startY}
              x2={sh.startX + 8}
              y2={sh.startY}
              stroke="url(#avs-shoot)"
              strokeWidth="0.15"
              strokeLinecap="round"
            />
            <circle cx={sh.startX + 8} cy={sh.startY} r="0.2" fill="#ffffff" />
          </g>
        ))}
      </svg>

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </div>
  );
}
