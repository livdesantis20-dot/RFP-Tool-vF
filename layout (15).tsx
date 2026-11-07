import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { cookies } from "next/headers";
import { FIRM } from "@/lib/brand";
import { DEMO_MODE } from "@/lib/demo";
import { DEMO_STEPS, STEP_COOKIE } from "@/lib/demo-steps";
import { DemoBanner } from "@/components/demo-banner";
import { getRfp } from "@/lib/rfp";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});
const title = `${FIRM.product} · ${FIRM.name}`;
const description =
  "Run an RFP downselection end to end: collect vendor responses and pricing, apply a weighted evaluation framework, and reach a steering-committee consensus.";

export const metadata: Metadata = {
  title,
  description,
  icons: { icon: "/favicon.svg" },
  openGraph: { title, description, type: "website" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = Number((await cookies()).get(STEP_COOKIE)?.value);
  const step = DEMO_MODE && Number.isInteger(raw) && raw >= 1 && raw <= DEMO_STEPS.length ? raw : null;
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SiteNav />
        {DEMO_MODE && <DemoBanner step={step} published={(await getRfp()).resultsPublished} />}
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-white py-6 text-sm text-muted">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap justify-between gap-3">
            <span>
              © {new Date().getFullYear()} {FIRM.name}
            </span>
            <span>Confidential — prepared for the client steering committee</span>
          </div>
        </footer>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
