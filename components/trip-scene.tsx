"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * The landing illustration: friends flying in from different corners to meet on
 * one island, under a sun drawn as the Lakad mark (two circles, one overlap). Each
 * arrival lays a towel in that friend's colour on the sand.
 *
 * The story (routes, planes, ripples, towels) runs on SVG's own timeline (SMIL) so
 * it stays in sync; the ambience (waves, clouds, birds, palm, boat, glints) is CSS
 * in globals.css (`scene-*`). On desktop the layers shift with the pointer for a
 * little depth. With reduced motion, the story freezes on the frame where everyone
 * has landed, and the CSS motion and parallax are off.
 */

const LOOP = 12; // seconds
const FLIGHT = 4.6;
const ISLAND = { x: 214, y: 336 };

const flights = [
  {
    d: `M -12 168 C 70 96, 150 150, ${ISLAND.x} ${ISLAND.y}`,
    start: 0.3,
    tone: "var(--accent)",
    towel: { x: 150, y: 348, rotate: -8 },
  },
  {
    d: `M 128 -12 C 148 110, 262 150, ${ISLAND.x} ${ISLAND.y}`,
    start: 1.5,
    tone: "var(--ok)",
    towel: { x: 203, y: 351, rotate: 5 },
  },
  {
    d: `M 412 238 C 336 190, 262 236, ${ISLAND.x} ${ISLAND.y}`,
    start: 2.7,
    tone: "var(--warn)",
    towel: { x: 262, y: 347, rotate: -4 },
  },
];

/** When everything that arrived fades, ready for the next loop (fraction of LOOP). */
const FADE_FROM = 0.86;
const FADE_TO = 0.94;

const fill = (token: string): CSSProperties => ({ fill: `var(--scene-${token})` });
const t = (seconds: number) => (seconds / LOOP).toFixed(4);
const loop = { dur: `${LOOP}s`, repeatCount: "indefinite" } as const;
const ease = { calcMode: "spline", keySplines: "0 0 1 1;0.45 0 0.25 1;0 0 1 1" } as const;

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

/** Sunlight on the water, under the sun: [x, y, width]. */
const glints = [
  [302, 307, 34],
  [294, 314, 22],
  [308, 320, 26],
  [298, 327, 16],
  [306, 334, 12],
  [300, 341, 8],
];

const birds = [
  { y: 74, delay: -4, scale: 1 },
  { y: 92, delay: -5.2, scale: 0.8 },
  { y: 60, delay: -19, scale: 0.9 },
];

export function TripScene({ className = "" }: { className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = frame.current;
    const scene = svg.current;
    if (!el || !scene) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Everyone has landed; routes and towels are still showing at 9s.
      scene.setCurrentTime(9);
      scene.pauseAnimations();
      return;
    }
    if (!window.matchMedia("(pointer: fine)").matches) return;

    // Parallax: layers read --px/--py (-1…1) and shift by their own --depth.
    let raf = 0;
    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const px = ((event.clientX - box.left) / box.width - 0.5) * 2;
      const py = ((event.clientY - box.top) / box.height - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
      });
    };
    const reset = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <div ref={frame} className={`relative overflow-hidden ${className}`} aria-hidden>
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
                  {...ease}
                  {...loop}
                />
              </path>
            </mask>
          ))}
        </defs>

        <rect width="400" height="500" fill="url(#scene-sky)" />

        {/* Far: stars (dusk only), the sun as the Lakad mark. */}
        <Layer depth={3}>
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
        </Layer>

        <Layer depth={5}>
          {birds.map((b, i) => (
            <g key={i} transform={`translate(0 ${b.y}) scale(${b.scale})`}>
              <g className="scene-bird" style={{ animationDelay: `${b.delay}s` }}>
                <path
                  d="M -7 0 Q -3.5 -4.5 0 0 Q 3.5 -4.5 7 0"
                  fill="none"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className="scene-flap"
                  style={{
                    stroke: "var(--scene-route)",
                    opacity: 0.55,
                    animationDelay: `${-i * 0.2}s`,
                  }}
                />
              </g>
            </g>
          ))}
        </Layer>

        <Layer depth={6}>
          <Cloud x={46} y={96} scale={1} className="scene-cloud" />
          <Cloud x={232} y={206} scale={0.78} className="scene-cloud scene-cloud-slow" />
        </Layer>

        {/* Mid: the far hills (extended past the edges and below the waterline for parallax). */}
        <Layer depth={8}>
          <path
            d="M -24 312 V 291 C 6 283 58 285 80 292 C 102 280 138 283 162 300 V 312 Z M 262 312 V 300 C 292 285 330 283 358 292 C 378 287 400 289 424 292 V 312 Z"
            style={fill("far")}
          />
        </Layer>

        <rect x="-24" y="299" width="448" height="201" style={fill("sea")} />

        <Layer depth={11}>
          <path
            d={wave(312, 3, 60)}
            style={{ ...fill("foam"), opacity: 0.35, ["--wave" as string]: "-60px" }}
            className="scene-wave scene-wave-slow"
          />
          {glints.map(([x, y, w], i) => (
            <rect
              key={i}
              x={x - w / 2}
              y={y}
              width={w}
              height="1.6"
              rx="0.8"
              className="scene-glint"
              style={{ fill: "var(--accent)", animationDelay: `${-i * 0.45}s` }}
            />
          ))}
          <path
            d={wave(370, 4, 80)}
            style={{ ...fill("sea-deep"), ["--wave" as string]: "-80px" }}
            className="scene-wave"
          />
        </Layer>

        {/* Near: the island everyone is heading to, the boat, the flights. */}
        <Layer depth={14}>
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

          {flights.map((f, i) => (
            <Towel key={i} {...f.towel} tone={f.tone} landsAt={f.start + FLIGHT} />
          ))}

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
        </Layer>

        <Layer depth={12}>
          <path
            d={wave(430, 5, 100)}
            style={{ ...fill("sea-deep"), opacity: 0.8, ["--wave" as string]: "-100px" }}
            className="scene-wave scene-wave-reverse"
          />
          <Boat />
        </Layer>

        <Layer depth={14}>
          {flights.map((f, i) => (
            <Flight key={i} index={i} {...f} />
          ))}
        </Layer>
      </svg>
    </div>
  );
}

/** A parallax plane of the scene: shifts with the pointer, more when nearer. */
function Layer({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <g className="scene-layer" style={{ ["--depth" as string]: depth }}>
      {children}
    </g>
  );
}

function Flight({ index, d, start, tone }: (typeof flights)[number] & { index: number }) {
  const lands = start + FLIGHT;
  return (
    <g>
      <g mask={`url(#scene-route-${index})`}>
        <path
          d={d}
          fill="none"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="1 7"
          style={{ stroke: "var(--scene-route)" }}
        >
          <animate
            attributeName="opacity"
            values="0.45;0.45;0;0"
            keyTimes={`0;${(FADE_FROM - 0.06).toFixed(2)};${(FADE_FROM + 0.04).toFixed(2)};1`}
            {...loop}
          />
        </path>
      </g>

      {/* The plane: follows the route, and shrinks as it comes in to land. */}
      <g opacity="0">
        <Plane tone={tone} />
        <animateMotion
          path={d}
          rotate="auto"
          keyPoints="0;0;1;1"
          keyTimes={`0;${t(start)};${t(lands)};1`}
          {...ease}
          {...loop}
        />
        <animateTransform
          attributeName="transform"
          type="scale"
          additive="sum"
          values="1.2;1.2;0.55;0.55"
          keyTimes={`0;${t(start)};${t(lands)};1`}
          {...ease}
          {...loop}
        />
        <animate
          attributeName="opacity"
          values="0;0;1;1;0;0"
          keyTimes={`0;${t(start)};${t(start + 0.3)};${t(lands - 0.3)};${t(lands)};1`}
          {...loop}
        />
      </g>

      {/* Landing ripple. */}
      <ellipse
        cx={ISLAND.x}
        cy={ISLAND.y + 4}
        rx="4"
        ry="1.6"
        fill="none"
        strokeWidth="2"
        opacity="0"
        style={{ stroke: tone }}
      >
        <animate
          attributeName="rx"
          values="4;4;34;34"
          keyTimes={`0;${t(lands)};${t(lands + 1.1)};1`}
          {...loop}
        />
        <animate
          attributeName="ry"
          values="1.6;1.6;11;11"
          keyTimes={`0;${t(lands)};${t(lands + 1.1)};1`}
          {...loop}
        />
        <animate
          attributeName="opacity"
          values="0;0;0.9;0;0"
          keyTimes={`0;${t(lands - 0.01)};${t(lands + 0.05)};${t(lands + 1.1)};1`}
          {...loop}
        />
      </ellipse>
    </g>
  );
}

/** Dropped on the sand when its friend lands; cleared before the next loop. */
function Towel({
  x,
  y,
  rotate,
  tone,
  landsAt,
}: {
  x: number;
  y: number;
  rotate: number;
  tone: string;
  landsAt: number;
}) {
  const down = landsAt + 0.15;
  const settled = down + 0.4;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <g opacity="0">
        <rect x="-13" y="-4.5" width="26" height="9" rx="2" style={{ fill: tone }} />
        <rect
          x="-7"
          y="-4.5"
          width="2.4"
          height="9"
          style={{ fill: "var(--scene-cloud)", opacity: 0.85 }}
        />
        <rect
          x="4.6"
          y="-4.5"
          width="2.4"
          height="9"
          style={{ fill: "var(--scene-cloud)", opacity: 0.85 }}
        />
        <animate
          attributeName="opacity"
          values="0;0;1;1;0;0"
          keyTimes={`0;${t(down)};${t(settled)};${FADE_FROM};${FADE_TO};1`}
          {...loop}
        />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 -9;0 -9;0 1.2;0 0;0 0"
          keyTimes={`0;${t(down)};${t(down + 0.25)};${t(settled)};1`}
          {...loop}
        />
      </g>
    </g>
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

/** Timing of the boat's trip (fractions of LOOP): in from the right, moor, sail out. */
const SAIL_IN = [0.04, 0.56] as const;
const SAIL_OUT = [FADE_FROM, 1] as const;

/**
 * The friend who came by sea: sails in from the right while the planes fly, moors
 * beside the island, and heads back out as the scene resets — off-screen at the
 * loop boundary, so there's no visible jump.
 */
function Boat() {
  const keyTimes = `0;${SAIL_IN[0]};${SAIL_IN[1]};${SAIL_OUT[0]};${SAIL_OUT[1]}`;
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="translate"
        values="150 6;150 6;0 0;0 0;150 6"
        keyTimes={keyTimes}
        calcMode="spline"
        keySplines="0 0 1 1;0.3 0 0.2 1;0 0 1 1;0.5 0 0.8 1"
        {...loop}
      />

      {/* Wake, only while sailing in. */}
      <g
        fill="none"
        strokeLinecap="round"
        strokeWidth="1.4"
        style={{ stroke: "var(--scene-foam)" }}
      >
        <path d="M 344 409 q 10 -1.5 20 -4" />
        <path d="M 344 413 q 12 2 24 3" />
        <path d="M 350 411 h 10" opacity="0.6" />
        <animate
          attributeName="opacity"
          values="0;0;0.8;0;0"
          keyTimes={`0;${SAIL_IN[0]};${(SAIL_IN[0] + 0.08).toFixed(2)};${SAIL_IN[1]};1`}
          {...loop}
        />
      </g>

      {/* Its reflection stays level while the boat rocks above it. */}
      <ellipse
        cx="320"
        cy="419"
        rx="24"
        ry="2.6"
        className="scene-reflection"
        style={{ fill: "#000", opacity: 0.16 }}
      />

      <g className="scene-boat">
        <path d="M 318.5 403 V 362" strokeWidth="1.8" style={{ stroke: "var(--scene-wood)" }} />
        {/* Pennant at the masthead. */}
        <path
          d="M 319 362.5 L 328 365 L 319 367.5 Z"
          className="scene-pennant"
          style={{ fill: "var(--accent)" }}
        />
        {/* Mainsail billows aft; jib forward. */}
        <path d="M 320.5 366 C 331 373 338 386 339.5 400 H 320.5 Z" style={fill("foam")} />
        <path
          d="M 320.5 380 C 327 384 331 391 332 400"
          fill="none"
          strokeWidth="0.8"
          style={{ stroke: "var(--scene-sand-shade)", opacity: 0.8 }}
        />
        <path
          d="M 316.5 369 C 309 379 304 389 302 400 H 316.5 Z"
          style={{ fill: "var(--accent)" }}
        />

        {/* The passenger, waving. */}
        <circle cx="330.5" cy="394.5" r="2.4" style={{ fill: "var(--scene-route)" }} />
        <path
          d="M 327.5 402 V 399.4 a 3 3 0 0 1 6 0 V 402 Z"
          style={{ fill: "var(--scene-route)" }}
        />
        <path
          d="M 333.3 399 L 337 394.6"
          strokeWidth="1.3"
          strokeLinecap="round"
          className="scene-wave-hand"
          style={{ stroke: "var(--scene-route)" }}
        />

        <path
          d="M 295 401.5 H 343 C 341 409.5 335 415 326.5 416 H 309 C 301.5 415 296.5 409.5 295 401.5 Z"
          style={fill("wood")}
        />
        <path d="M 296.4 405.2 H 341.6" strokeWidth="1.6" style={{ stroke: "var(--accent)" }} />
        <circle cx="309" cy="409.5" r="1.3" style={fill("foam")} />
        <circle cx="318" cy="409.5" r="1.3" style={fill("foam")} />
        <circle cx="327" cy="409.5" r="1.3" style={fill("foam")} />
      </g>
    </g>
  );
}
