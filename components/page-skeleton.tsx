/** Instant placeholder for a trip tab while its data loads, so a tap always shows a response. */
export function PageSkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div
      className="mx-auto w-full max-w-[430px] lg:max-w-[1040px] px-5 lg:px-6 pt-3 lg:pt-8"
      aria-busy
    >
      <div className="flex items-center justify-between pb-3.5 lg:pb-6">
        <div className="skeleton h-[22px] lg:h-9 w-32 lg:w-48 rounded-[10px]" />
        <div className="skeleton h-3.5 w-16 rounded-[7px]" />
      </div>
      <div className="flex flex-col gap-2.5 lg:gap-3.5">
        <div className="skeleton h-[120px] lg:h-[140px] rounded-[20px]" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton h-16 lg:h-[72px] rounded-[16px]" />
        ))}
      </div>
      <div className="flex items-center justify-center gap-[9px] mt-5">
        <span className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse-dot" />
        <p className="font-medium text-[13px] text-ink2">{label}</p>
      </div>
    </div>
  );
}
