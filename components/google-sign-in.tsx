"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * "Continue with Google", in Google's own button style. After Google, sign-in
 * lands on /auth/claim, which attaches this browser's guest trips to the account
 * and then returns to `next`.
 */
export function GoogleSignIn({
  next,
  label = "Continue with Google",
  compact = false,
  className = "",
}: {
  next: string;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `/auth/claim?next=${encodeURIComponent(next)}`,
    });
    if (error) {
      setPending(false);
      setError("Couldn't reach Google. Try again in a moment.");
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className={`w-full inline-flex items-center justify-center gap-2.5 bg-white text-[#1f1f1f] border border-[#747775] rounded-full font-medium cursor-pointer hover:bg-[#f8f9fa] disabled:opacity-60 ${
          compact ? "h-9 px-3.5 text-[13px]" : "h-11 px-5 text-[14px]"
        }`}
      >
        <GoogleG />
        {pending ? "Opening Google…" : label}
      </button>
      {error && <p className="text-[12px] text-warn mt-2">{error}</p>}
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
