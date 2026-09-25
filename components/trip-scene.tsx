"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * The landing illustration: friends flying in from different corners to meet on
 * one island, under a sun drawn as the Lakad mark (two circles, one overlap).
 *
 * The flights run on SVG's own timeline (SMIL) so each route, plane and landing
 * ripple stay in sync; the ambient motion (waves, clouds, palm, boat) is CSS in
 * globals.css (`scene-*`). With reduced motion, the flights freeze on the frame
 * where everyone has landed and the CSS motion is switched off globally.
 */

const LOOP = 12; // seconds
const FLIGHT = 4.6;

const ISLAND = { x: 214, y: 336 };

const flights = [
  { d: `M -12 168 C 70 96, 150 150, ${ISLAND.x} ${ISLAND.y}`, start: 0.3, tone: "var(--accent)" },
  { d: `M 128 -12 C 148 110, 262 150, ${ISLAND.x} ${ISLAND.y}`, start: 1.5, tone: "var(--ok)" },
  { d: `M 412 238 C 336 190, 262 236, ${ISLAND.x} ${ISLAND.y}`, start: 2.7, tone: "var(--warn)" },
];

const fill = (token: string): CSSProperties => ({ fill: `var(--scene-${token})` });

/** A repeating wave band, wider than the scene so it can scroll seamlessly. */
function wave(y: number, amp: number, period: number) {
  let d = `M -${period} ${y}`;
  for (let x = -period; x < 400 + period; x += period) {
    d += ` q ${period / 4} ${-amp} ${period / 2} 0 t ${period / 2} 0`;
  }
  return `${d} V 500 H -${period} Z`;
}

const stars = [
  [34, 40, 1.4],
  [92, 22, 1],
  [150, 58, 1.2],
  [210, 30, 1.6],
  [58, 110, 1],
  [372, 36, 1.2],
  [340, 92, 1],
  [248, 84, 1],
  [118, 150, 1.2],
  [384, 150, 1],
];

export function TripScene({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svg.current;
    if (!el || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Everyone has landed and the routes are still drawn at 9s.
    el.setCurrentTime(9);
    el.pauseAnimations();
  }, []);

  const t = (seconds: number) => (seconds / LOOP).toFixed(4);

  return (
    <div className={`relative overflow-hidden ${className}`} aria-hidden>
      <svg
        ref={svg}
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--scene-sky-top)" }} />
            <stop offset="0.62" style={{ stopColor: "var(--scene-sky-bottom)" }} />
          </linearGradient>
          <radialGradient id="scene-glow">
            <stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.45 }} />
            <stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
          </radialGradient>
          {flights.map((f, i) => (
            <mask key={i} id={`scene-route-${i}`} maskUnits="userSpaceOnUse">
              {/* Reveals the dashed route behind its plane. */}
              <path
                d={f.d}
                fill="none"
                stroke="#fff"
                strokeWidth="8"
                pathLength={1}
                strokeDasharray="1 1"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="1;1;0;0"
                  keyTimes={`0;${t(f.start)};${t(f.start + FLIGHT)};1`}
                  calcMode="spline"
                  keySplines="0 0 1 1;0.45 0 0.25 1;0 0 1 1"
                  dur={`${LOOP}s`}
                  repeatCount="indefinite"
                />
              </path>
            </mask>
          ))}
        </defs>

        {/* Sky, stars (dusk only), and the sun as the Lakad mark. */}
        <rect width="400" height="500" fill="url(#scene-sky)" />
        <g style={{ opacity: "var(--scene-stars)" }}>
          {stars.map(([x, y, r], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill="#fff"
              className="scene-star"
              style={{ animationDelay: `${-i * 0.7}s` }}
            />
          ))}
        </g>
        <circle cx="300" cy="150" r="96" fill="url(#scene-glow)" className="scene-glow" />
        <g style={{ fill: "var(--accent)" }}>
          <circle cx="282" cy="150" r="40" opacity="0.35" />
          <circle cx="318" cy="150" r="40" opacity="0.35" />
          <path d="M300 114.28 A40 40 0 0 1 300 185.72 A40 40 0 0 1 300 114.28 Z" />
        </g>

        <Cloud x={46} y={96} scale={1} className="scene-cloud" />
        <Cloud x={232} y={206} scale={0.78} className="scene-cloud scene-cloud-slow" />

        {/* Horizon and sea. */}
        <path
          d="M0 300 V 291 C 30 283 58 285 80 292 C 102 280 138 283 162 300 Z M 262 300 C 292 285 330 283 358 292 C 378 287 394 289 400 292 V 300 Z"
          style={fill("far")}
        />
        <rect y="299" width="400" height="201" style={fill("sea")} />
        <path
          d={wave(312, 3, 60)}
          style={{ ...fill("foam"), opacity: 0.35, ["--wave" as string]: "-60px" }}
          className="scene-wave scene-wave-slow"
        />
        <path
          d={wave(370, 4, 80)}
          style={{ ...fill("sea-deep"), ["--wave" as string]: "-80px" }}
          className="scene-wave"
        />
        <path
          d={wave(430, 5, 100)}
          style={{ ...fill("sea-deep"), opacity: 0.8, ["--wave" as string]: "-100px" }}
          className="scene-wave scene-wave-reverse"
        />

        {/* The island everyone is heading to. */}
        <ellipse
          cx="206"
          cy="356"
          rx="104"
          ry="12"
          style={{ ...fill("foam"), opacity: 0.5 }}
          className="scene-shore"
        />
        <path d="M 112 356 C 146 318 266 318 300 356 Z" style={fill("sand")} />
        <path d="M 196 356 C 232 336 276 338 300 356 Z" style={fill("sand-shade")} />

        <g className="scene-palm">
          <path
            d="M183 338 C 188 304 177 282 170 256"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            style={{ stroke: "var(--scene-wood)" }}
          />
          <g style={fill("leaf-dark")}>
            <path d="M170 256 C 152 256 140 270 137 288 C 147 273 158 263 170 256 Z" />
            <path d="M170 256 C 190 257 203 271 206 288 C 195 273 183 263 170 256 Z" />
          </g>
          <g style={fill("leaf")}>
            <path d="M170 256 C 150 239 131 243 118 258 C 137 250 154 252 170 256 Z" />
            <path d="M170 256 C 160 232 170 213 188 207 C 177 222 172 238 170 256 Z" />
            <path d="M170 256 C 191 237 213 240 224 254 C 207 247 188 250 170 256 Z" />
          </g>
          <circle cx="166" cy="262" r="3.4" style={fill("wood")} />
          <circle cx="173.5" cy="263.5" r="3.4" style={fill("wood")} />
        </g>

        <g>
          <path
            d="M244 338 L 237 292"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ stroke: "var(--scene-wood)" }}
          />
          <path d="M 210 296 A 27 21 -9 0 1 263 287 Z" style={{ fill: "var(--accent)" }} />
          <path d="M 229 294 L 234 271 L 244 290 Z" style={{ fill: "var(--scene-cloud)" }} />
        </g>

        <g className="scene-boat">
          <path d="M 318 404 V 370" strokeWidth="1.8" style={{ stroke: "var(--scene-wood)" }} />
          <path d="M 320 372 V 401 L 340 401 Z" style={fill("cloud")} />
          <path d="M 316 376 V 399 L 303 399 Z" style={{ fill: "var(--accent)" }} />
          <path d="M 298 404 H 340 L 333 414 H 305 Z" style={fill("wood")} />
        </g>
        {/* Routes and planes, drawn last so they fly over the island. */}
        {flights.map((f, i) => (
          <g key={i}>
            <g mask={`url(#scene-route-${i})`}>
              <path
                d={f.d}
                fill="none"
                style={{ stroke: "var(--scene-route)" }}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeDasharray="1 7"
              >
                <animate
                  attributeName="opacity"
                  values="0.45;0.45;0;0"
                  keyTimes="0;0.8;0.9;1"
                  dur={`${LOOP}s`}
                  repeatCount="indefinite"
                />
              </path>
            </g>
            <g opacity="0">
              <Plane tone={f.tone} />
              <animateMotion
                path={f.d}
                rotate="auto"
                keyPoints="0;0;1;1"
                keyTimes={`0;${t(f.start)};${t(f.start + FLIGHT)};1`}
                calcMode="spline"
                keySplines="0 0 1 1;0.45 0 0.25 1;0 0 1 1"
                dur={`${LOOP}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;0;1;1;0;0"
                keyTimes={`0;${t(f.start)};${t(f.start + 0.3)};${t(f.start + FLIGHT - 0.35)};${t(f.start + FLIGHT)};1`}
                dur={`${LOOP}s`}
                repeatCount="indefinite"
              />
            </g>
            {/* Landing ripple. */}
            <ellipse
              cx={ISLAND.x}
              cy={ISLAND.y + 4}
              rx="4"
              ry="1.6"
              fill="none"
              style={{ stroke: f.tone }}
              strokeWidth="2"
              opacity="0"
            >
              <animate
                attributeName="rx"
                values="4;4;34;34"
                keyTimes={`0;${t(f.start + FLIGHT)};${t(f.start + FLIGHT + 1.1)};1`}
                dur={`${LOOP}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="ry"
                values="1.6;1.6;11;11"
                keyTimes={`0;${t(f.start + FLIGHT)};${t(f.start + FLIGHT + 1.1)};1`}
                dur={`${LOOP}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;0;0.9;0;0"
                keyTimes={`0;${t(f.start + FLIGHT - 0.01)};${t(f.start + FLIGHT + 0.05)};${t(f.start + FLIGHT + 1.1)};1`}
                dur={`${LOOP}s`}
                repeatCount="indefinite"
              />
            </ellipse>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Cloud({
  x,
  y,
  scale,
  className,
}: {
  x: number;
  y: number;
  scale: number;
  className: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={className} style={fill("cloud")}>
        <circle cx="0" cy="0" r="14" />
        <circle cx="21" cy="-9" r="19" />
        <circle cx="44" cy="0" r="13" />
        <rect x="-14" y="0" width="71" height="13" rx="6.5" />
      </g>
    </g>
  );
}

/** Points along +x so `rotate="auto"` banks it along the route. */
function Plane({ tone }: { tone: string }) {
  return (
    <g transform="scale(1.5)" style={{ fill: tone }}>
      <path d="M -9 -1.4 L 7 -1.6 C 10 -1.2 10 1.2 7 1.6 L -9 1.4 Z" />
      <path d="M -1 0 L -6 -9 L -2.5 -9 L 5 0 L -2.5 9 L -6 9 Z" />
      <path d="M -8.5 0 L -11 -4.5 L -9.3 -4.5 L -6.5 0 L -9.3 4.5 L -11 4.5 Z" />
    </g>
  );
}
