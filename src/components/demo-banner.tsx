"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { DEMO_STEPS, STEP_COOKIE } from "@/lib/demo-steps";

// Sticky guide bar under the nav. During the tour it shows the current step's
// instruction with Back / Next; otherwise it offers the tour.
export function DemoBanner({ step, published }: { step: number | null; published: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  function exit() {
    document.cookie = `${STEP_COOKIE}=; Max-Age=0; path=/`;
    router.refresh();
  }

  if (!step) {
    if (pathname === "/demo" || pathname === "/") return null;
    return (
      <div className="bg-accent-tint border-b border-accent/30 text-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-navy">
          <Compass size={15} className="text-accent shrink-0" />
          <span>New here?</span>
          <a href="/demo" className="font-semibold text-accent hover:text-navy underline-offset-2 hover:underline">
            Take the 10-minute guided demo →
          </a>
        </div>
      </div>
    );
  }

  const s = DEMO_STEPS[step - 1];
  if (!s) return null;
  const last = step === DEMO_STEPS.length;

  return (
    <div className="sticky top-16 z-30 bg-navy text-white border-b border-navy-deep shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-accent-bright font-semibold">
            Guided demo · Step {step} of {DEMO_STEPS.length} · {s.title}
          </p>
          <p className="text-sm text-white/90 mt-0.5">
            {!published && s.bannerIfUnpublished ? s.bannerIfUnpublished : s.banner}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {step > 1 && (
            <a
              href={`/demo/go/${step - 1}`}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-white/30 text-sm hover:bg-white/10"
            >
              <ArrowLeft size={14} /> Back
            </a>
          )}
          {last ? (
            <a
              href="/demo"
              onClick={() => {
                document.cookie = `${STEP_COOKIE}=; Max-Age=0; path=/`;
              }}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-accent text-white text-sm font-semibold hover:bg-accent-bright"
            >
              Finish tour
            </a>
          ) : (
            <a
              href={`/demo/go/${step + 1}`}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-accent text-white text-sm font-semibold hover:bg-accent-bright"
            >
              Next: {DEMO_STEPS[step].title} <ArrowRight size={14} />
            </a>
          )}
          <button
            type="button"
            onClick={exit}
            aria-label="Exit the guided demo"
            title="Exit the guided demo"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-white/70 hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
