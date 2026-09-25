"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/account";
import { SignInOptions } from "@/components/social-sign-in";
import { authClient } from "@/lib/auth-client";

/** Adds another sign-in method to the account you're signed in to. */
export function ConnectProvider({ provider, label }: { provider: "google" | "facebook"; label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setPending(true);
    setError(null);
    const { error } = await authClient.linkSocial({ provider, callbackURL: "/account" });
    if (error) {
      setPending(false);
      setError(error.message ?? `Couldn't connect ${label}.`);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={connect}
        disabled={pending}
        className="border border-line rounded-full px-[13px] py-[7px] font-semibold text-[11px] text-ink2 cursor-pointer hover:border-accent disabled:opacity-60"
      >
        {pending ? "Opening…" : `Connect ${label}`}
      </button>
      {error && <p className="text-[11px] text-warn mt-1.5">{error}</p>}
    </div>
  );
}

/** Type "delete", press the button. Needs a recent sign-in (the server checks). */
export function DeleteAccountForm() {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reauth, setReauth] = useState(false);

  return (
    <form
      action={(formData) =>
        start(async () => {
          setError(null);
          const result = await deleteAccount(formData);
          if (result?.error) {
            setError(result.error);
            setReauth(Boolean(result.reauth));
          }
        })
      }
      className="flex flex-col gap-3"
    >
      <label htmlFor="confirm-delete" className="text-[13px] text-ink2">
        Type <b className="text-ink">delete</b> to confirm
      </label>
      <input
        id="confirm-delete"
        name="confirm"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        className="w-full h-11 bg-bg border border-line focus:border-warn rounded-xl px-3 text-[16px] lg:text-[14px] outline-none"
      />
      <button
        type="submit"
        disabled={pending || confirm.trim().toLowerCase() !== "delete"}
        className="h-11 rounded-xl bg-warn text-white font-semibold text-[14px] cursor-pointer hover:opacity-90 disabled:opacity-45 disabled:cursor-default"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
      {error && <p className="text-[12px] text-warn">{error}</p>}
      {reauth && <SignInOptions next="/account" className="mt-1" />}
    </form>
  );
}
