import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/account";
import { ConnectProvider, DeleteAccountForm } from "@/components/account-controls";
import { AccountAvatar } from "@/components/account-menu";
import { BrandBar } from "@/components/brand-bar";
import { FORMER_MEMBER, getSignInMethods } from "@/lib/accounts";
import { FACEBOOK_SIGN_IN } from "@/lib/features";
import { getAccountView, getUser } from "@/lib/session";

export const metadata = { title: "Your account · Lakad" };

const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "facebook", label: "Facebook" },
] as const;

export default async function AccountPage() {
  const [user, view] = await Promise.all([getUser(), getAccountView()]);
  if (!user || !view) redirect("/sign-in?next=/account");
  const methods = await getSignInMethods(user.id);

  const card = "bg-surface border border-line rounded-[20px] p-5";
  return (
    <div className="flex flex-col flex-1">
      <BrandBar />
      <main className="mx-auto w-full max-w-[520px] px-[22px] pt-8 pb-16 flex flex-col gap-4">
        <Link href="/" className="font-medium text-[13px] text-ink2 hover:text-ink">
          ← Your trips
        </Link>
        <h1 className="font-display font-semibold text-[30px] tracking-[-0.025em]">Your account</h1>

        <section className={`${card} flex items-center gap-3.5`}>
          <AccountAvatar user={view} size={48} />
          <div className="min-w-0">
            <div className="font-semibold text-[16px] truncate">{view.name}</div>
            <div className="text-[13px] text-ink2 truncate">
              {view.email ?? "No email shared by your sign-in"}
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className="font-display font-semibold text-[17px] mb-1">Sign-in methods</h2>
          <p className="text-[13px] text-ink2 mb-4">Use any of these to open your account.</p>
          <ul className="flex flex-col divide-y divide-line">
            {PROVIDERS.filter(
              // Hidden providers still show if already connected, so nobody loses track of one.
              (provider) =>
                provider.id !== "facebook" || FACEBOOK_SIGN_IN || methods.includes(provider.id),
            ).map((provider) => (
              <li key={provider.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-medium text-[14px]">{provider.label}</span>
                {methods.includes(provider.id) ? (
                  <span className="text-[12px] font-semibold text-ok">Connected</span>
                ) : (
                  <ConnectProvider provider={provider.id} label={provider.label} />
                )}
              </li>
            ))}
          </ul>
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="border border-line rounded-full px-4 py-2 font-semibold text-[12px] text-ink2 cursor-pointer hover:border-accent"
            >
              Sign out
            </button>
          </form>
        </section>

        <section id="delete" className={`${card} border-warn/40 scroll-mt-6`}>
          <h2 className="font-display font-semibold text-[17px] mb-1">Delete account</h2>
          <p className="text-[13px] leading-[1.55] text-ink2 mb-4">
            This permanently deletes your account, email and photo, and signs you out everywhere.
            Your spots on trips stay so your friends&rsquo; plans and balances still add up, but
            they show as &ldquo;{FORMER_MEMBER}&rdquo; and no one can sign in as them. This
            can&rsquo;t be undone.
          </p>
          <DeleteAccountForm />
        </section>
      </main>
    </div>
  );
}
