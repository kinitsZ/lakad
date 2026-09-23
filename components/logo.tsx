/**
 * The Lakad mark: two circles of availability and the overlap where the
 * group actually agrees — the same idea the date heatmap is built on.
 * The viewBox is cropped to the artwork, so `size` is the mark's real height.
 */
export function LogoMark({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 4 27 16"
      width={Math.round((size * 27) / 16)}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="8" cy="12" r="8" opacity="0.32" />
      <circle cx="19" cy="12" r="8" opacity="0.32" />
      <path d="M13.5 6.191A8 8 0 0 1 13.5 17.809 8 8 0 0 1 13.5 6.191Z" />
    </svg>
  );
}

export function Logo({
  markSize = 20,
  className = "",
  textClassName = "font-display font-bold text-[16px]",
}: {
  markSize?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} className="text-accent" />
      <span className={textClassName}>Lakad</span>
    </span>
  );
}
