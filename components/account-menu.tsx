"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/account";

export type AccountView = { name: string; email: string | null; image: string | null };

/** Your photo in the header; opens your name, email, trips and "Sign out". */
export function AccountMenu({ user }: { user: AccountView }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Account: ${user.name}`}
        className="block rounded-full cursor-pointer ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-line"
      >
        <AccountAvatar user={user} size={30} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-64 bg-surface border border-line rounded-[16px] shadow-frame p-3 animate-rise">
          <div className="flex items-center gap-2.5 px-1 pb-3 border-b border-line">
            <AccountAvatar user={user} size={36} />
            <div className="min-w-0">
              <div className="font-semibold text-[14px] truncate">{user.name}</div>
              {user.email && <div className="text-[12px] text-ink2 truncate">{user.email}</div>}
            </div>
          </div>
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block mt-2 px-2 py-2 rounded-[10px] text-[13px] font-medium hover:bg-surface2"
          >
            Your trips
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-2 py-2 rounded-[10px] text-[13px] font-medium hover:bg-surface2"
          >
            Account
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-2 py-2 rounded-[10px] text-[13px] font-medium text-ink2 cursor-pointer hover:bg-surface2 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function AccountAvatar({ user, size }: { user: AccountView; size: number }) {
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google-hosted profile photo
      <img
        src={user.image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-accent-soft text-accent font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {user.name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
