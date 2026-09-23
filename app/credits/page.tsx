import Image from "next/image";
import Link from "next/link";
import { BrandBar } from "@/components/brand-bar";
import { allPhotos } from "@/lib/images";

export const metadata = { title: "Photo credits · Lakad" };

export default function CreditsPage() {
  return (
    <>
      <BrandBar />
      <div className="mx-auto w-full max-w-[430px] lg:max-w-[760px] px-[22px] lg:px-6 py-8 lg:py-12">
        <Link
          href="/"
          className="font-medium text-[13px] text-ink2 hover:text-ink mb-6 inline-block"
        >
          ← Back
        </Link>
        <h1 className="font-display font-semibold text-[30px] lg:text-[38px] tracking-[-0.025em] mb-3">
          Photo credits
        </h1>
        <p className="text-[14px] leading-[1.6] text-ink2 mb-8">
          Lakad&rsquo;s photography comes from Wikimedia Commons under
          Creative Commons licences. Images have been resized and cropped to
          fit; each one is credited to its photographer below.
        </p>

        <ul className="flex flex-col gap-4">
          {allPhotos.map((photo) => (
            <li
              key={photo.credit.sourceUrl}
              className="bg-surface border border-line rounded-[18px] p-4 flex gap-4 items-start"
            >
              <div className="relative w-[84px] h-[60px] shrink-0 rounded-xl overflow-hidden bg-surface2">
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="84px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[14px] mb-1">
                  {photo.credit.title}
                </div>
                <div className="text-[13px] text-ink2 mb-2">
                  by {photo.credit.artist}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                  <a
                    href={photo.credit.licenseUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent hover:underline"
                  >
                    {photo.credit.license}
                  </a>
                  <a
                    href={photo.credit.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-ink2 hover:text-ink hover:underline"
                  >
                    Source on Wikimedia Commons
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
