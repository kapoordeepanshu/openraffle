import Link from "next/link";
import type { Metadata } from "next";
import { config } from "@/config";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { Activity, Car, Grid, List, Logout, Settings, Ticket } from "@/components/icons";
import { paymentsMode } from "@/lib/settings";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Dashboard", Grid],
  ["/admin/raffles", "Raffles", Car],
  ["/admin/orders", "Orders", List],
  ["/admin/activity", "Activity", Activity],
  ["/admin/settings/payments", "Payments", Settings],
] as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r border-line bg-surface lg:min-h-dvh p-4 lg:p-5 flex lg:flex-col gap-4 lg:gap-8 items-center lg:items-stretch overflow-x-auto">
        <Link href="/admin" className="flex items-center gap-2.5 shrink-0">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-accent"><Ticket width={18} height={18} /></span>
          <span className="display text-sm hidden sm:inline">{config.siteName}</span>
        </Link>
        <nav className="flex lg:flex-col gap-1 text-sm" aria-label="Admin">
          {NAV.map(([href, label, Icon]) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted hover:text-fg hover:bg-surface-2 whitespace-nowrap">
              <Icon width={18} height={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="lg:mt-auto ml-auto lg:ml-0 flex lg:flex-col gap-3 text-xs text-muted items-center lg:items-start">
          <span className="hidden lg:block truncate max-w-full">{admin}</span>
          <form action={logout}>
            <button className="flex items-center gap-2 hover:text-fg"><Logout width={16} height={16} /> Sign out</button>
          </form>
          <Link href="/" className="hover:text-fg whitespace-nowrap">View site ↗</Link>
        </div>
      </aside>
      <main className="p-5 md:p-8 lg:p-10 min-w-0">
        {(await paymentsMode()) === "demo" && (
          <p className="mb-6 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs">Demo mode: checkouts are simulated. <Link href="/admin/settings/payments" className="underline font-semibold">Connect Stripe</Link> to take real payments.</p>
        )}
        {children}
      </main>
    </div>
  );
}
