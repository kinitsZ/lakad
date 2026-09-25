import { signOut } from "@/app/actions/account";
import { AccountAvatar, type AccountView } from "@/components/account-menu";
import { GoogleSignIn } from "@/components/google-sign-in";

/** On Updates: sign in to keep your trips everywhere, or see who you're signed in as. */
export function AccountCard({ user, next }: { user: AccountView | null; next: string }) {
  return (
    <section className="bg-surface border border-line rounded-[16px] lg:rounded-[20px] px-[15px] lg:px-[18px] py-[13px] lg:py-[18px]">
      {user ? (
        <>
          <h2 className="font-display font-semibold text-[15px] mb-3">Your account</h2>
          <div className="flex items-center gap-2.5 mb-3">
            <AccountAvatar user={user} size={34} />
            <div className="min-w-0">
              <div className="font-semibold text-[13px] truncate">{user.name}</div>
              <div className="text-[12px] text-ink2 truncate">{user.email}</div>
            </div>
          </div>
          <p className="text-[12px] lg:text-[13px] leading-[1.5] text-ink2 mb-3">
            Your trips are saved to this account — sign in on any phone or laptop to see them.
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="border border-line rounded-full px-[13px] py-[7px] font-semibold text-[11px] text-ink2 cursor-pointer hover:border-accent"
            >
              Sign out
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 className="font-display font-semibold text-[15px] mb-1">Keep your trips on every device</h2>
          <p className="text-[12px] lg:text-[13px] leading-[1.5] text-ink2 mb-3">
            Sign in and the trips you&rsquo;ve joined here are saved to your account, so you can
            open them anywhere. Optional — joining never needs it.
          </p>
          <GoogleSignIn next={next} />
        </>
      )}
    </section>
  );
}
