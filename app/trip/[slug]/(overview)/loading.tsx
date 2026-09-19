
export default function LoadingTrip() {
  return (
    <div className="w-full">
      <div className="skeleton h-[150px] lg:h-[210px]" />

      <div className="mx-auto w-full max-w-[430px] lg:max-w-[1280px] p-5 lg:px-6 lg:py-6 flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
        <div className="flex flex-col gap-3.5 lg:gap-[18px]">
          <div className="skeleton h-3.5 w-24 rounded-[7px]" />
          <div className="skeleton h-[30px] lg:h-[42px] w-[70%] rounded-[10px]" />
          <div className="flex">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] rounded-full bg-surface2"
                style={i === 0 ? undefined : { marginLeft: -9 }}
              />
            ))}
          </div>
          <div className="skeleton h-16 lg:h-[88px] rounded-[18px] lg:rounded-[20px]" />
          <div className="grid grid-cols-2 gap-2.5 lg:gap-3.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton h-24 lg:h-[190px] rounded-[18px] lg:rounded-[20px]"
              />
            ))}
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-3.5">
          <div className="skeleton h-[200px] rounded-[20px]" />
          <div className="skeleton h-[280px] rounded-[20px]" />
        </div>

        <div className="flex items-center justify-center gap-[9px] mt-2 lg:col-span-2">
          <span className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse-dot" />
          <p className="font-medium text-[13px] text-ink2">
            Loading the trip…
          </p>
        </div>
      </div>
    </div>
  );
}
