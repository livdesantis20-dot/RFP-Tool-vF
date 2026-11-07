"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileMenu({
  links,
  userLabel,
  signOut,
}: {
  links: { href: string; label: string }[];
  userLabel: string | null;
  signOut: (() => Promise<void>) | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        className="p-2 text-navy"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-16 bg-white border-b border-line shadow-md px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-navy font-medium"
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-line pt-3 mt-2">
            {userLabel && signOut ? (
              <form action={signOut} className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">{userLabel}</span>
                <button type="submit" className="text-sm font-medium text-navy underline">
                  Sign out
                </button>
              </form>
            ) : (
              <Link href="/signin" className="block py-2 font-medium text-accent">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
