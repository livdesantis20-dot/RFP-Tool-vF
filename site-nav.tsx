import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, clearSession, ROLE_LABEL } from "@/lib/auth";
import { getRfp } from "@/lib/rfp";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/mobile-menu";

export async function SiteNav() {
  const session = await auth();
  const user = session?.user;
  const rfp = await getRfp();
  const isCoordinator = user?.role === "coordinator";

  const links: { href: string; label: string }[] = [{ href: "/criteria", label: "Criteria" }];
  if (user) {
    links.push({ href: "/evaluate", label: isCoordinator ? "Responses" : "My evaluations" });
    links.push({ href: "/rankings", label: "Rankings" });
    if (isCoordinator || rfp.resultsPublished) links.push({ href: "/insights", label: "Insights" });
    if (isCoordinator) links.push({ href: "/rfp", label: "RFP setup" });
  }

  async function signOut() {
    "use server";
    await clearSession();
    redirect("/");
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <BrandMark />
          <span className="hidden lg:inline h-6 w-px bg-line" />
          <span className="hidden lg:inline text-sm text-muted truncate">RFP Evaluation Portal</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-navy hover:text-accent font-medium">
              {l.label}
            </Link>
          ))}
          {user ? (
            <form action={signOut} className="flex items-center gap-3 pl-2 border-l border-line">
              <span className="text-right leading-tight">
                <span className="block text-navy font-medium text-sm">{user.name}</span>
                <span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span>
              </span>
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          ) : (
            <Button asChild size="sm">
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </nav>
        <MobileMenu
          links={links}
          userLabel={user ? `${user.name} · ${ROLE_LABEL[user.role]}` : null}
          signOut={user ? signOut : null}
        />
      </div>
    </header>
  );
}
