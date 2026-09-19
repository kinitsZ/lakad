import { Cover } from "@/components/ui";
import { generateCover } from "@/lib/cover";
import { photoFor } from "@/lib/images";
import type { ReactNode } from "react";

/**
 * A trip's cover: the chosen photo when there is one, otherwise a banner
 * generated from the trip's name.
 */
export function TripBanner({
  name,
  seed,
  coverKey,
  className = "",
  columnClassName = "max-w-[1280px]",
  sizes = "100vw",
  priority = false,
  showName = true,
  children,
}: {
  name: string;
  seed: string;
  coverKey: string | null;
  className?: string;
  columnClassName?: string;
  sizes?: string;
  priority?: boolean;
  showName?: boolean;
  children?: ReactNode;
}) {
  const photo = photoFor(coverKey);

  if (photo) {
    return (
      <Cover photo={photo} className={className} sizes={sizes} priority={priority}>
        {children}
      </Cover>
    );
  }

  const cover = generateCover(seed);

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(115deg, ${cover.from} 0%, ${cover.to} 100%)`,
      }}
    >
      <svg
        className="absolute inset-0 -z-10 w-full h-full"
        viewBox="0 0 1200 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {cover.circles.map((circle, i) => (
          <circle
            key={i}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill="#ffffff"
            fillOpacity={circle.opacity}
          />
        ))}
      </svg>

      {showName && (
        <div className="absolute inset-0 -z-10 flex items-end pointer-events-none">
          <div className={`mx-auto w-full ${columnClassName} px-5 lg:px-6 pb-4 lg:pb-6`}>
            <div className="font-display font-semibold text-white/95 text-[26px] lg:text-[40px] leading-[1.05] tracking-[-0.03em] drop-shadow-[0_2px_14px_rgba(0,0,0,0.28)] line-clamp-2">
              {name}
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
