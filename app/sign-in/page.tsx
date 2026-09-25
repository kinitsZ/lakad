import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandBar } from "@/components/brand-bar";
import { SignInOptions } from "@/components/social-sign-in";
import { getUser } from "@/lib/session";

export const metadata = { title: "Sign in · Lakad" };

const ERRORS: Record<string, string> = {
  account_not_linked:
    "That email already has a Lakad account from a different sign-in. Use that one — then you can connect this one from your account page.",
  access_denied: "Sign-in was cancelled. Try again whenever you're ready.",
};

/** A path on this site to return to; anything else goes home. */
const safeNext = (next: unknown) =>
  typeof next === "string" && /^\/(?![\\/])/.test(next) && !next.includes("..") ? next : "/";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getUser()) redirect(next);

  const code = typeof params.error === "string" ? params.error : null;
  const message = code ? (ERRORS[code] ?? "Something went wrong signing in. Please try again.") : null;

  return (
    <div className="flex flex-col flex-1">
      <BrandBar />
      <main className="mx-auto w-full max-w-[400px] px-[22px] pt-10 pb-16 flex flex-col">
        <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
          Sign in to Lakad
        </h1>
        <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
          Your trips are saved to your account, so you can open them on any phone or laptop. New
          here? The same buttons create your account.
        </p>
        {message && (
          <p className="bg-warn-soft text-ink rounded-[14px] px-3.5 py-3 text-[13px] leading-[1.45] mb-5">
            {message}
          </p>
        )}
        <SignInOptions next={next} />
        <p className="text-[12px] leading-[1.5] text-ink2 mt-6">
          You don&rsquo;t need an account to join a trip. By signing in you agree to how we handle
          data in our{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
