import Link from "next/link";
import { config } from "@/config";
import { Ticket } from "@/components/icons";
import { paymentsMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {(await paymentsMode()) === "demo" && (
        <div className="bg-warn text-black text-center text-xs font-semibold py-2 px-4">
          Demo mode: payments are simulated. Connect Stripe in the admin to take real payments.
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-accent"><Ticket width={18} height={18} /></span>
            <span className="display text-sm sm:text-base whitespace-nowrap">{config.siteName}</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-6 text-sm" aria-label="Main">
            <Link href="/#live" className="hidden sm:inline text-muted hover:text-fg transition-colors">Live raffles</Link>
            <Link href="/#winners" className="hidden sm:inline text-muted hover:text-fg transition-colors">Winners</Link>
            <Link href="/#how" className="hidden md:inline text-muted hover:text-fg transition-colors">How it works</Link>
            <Link href="/#live" className="btn btn-primary !min-h-10 !px-4 sm:!px-5 text-sm whitespace-nowrap">Enter now</Link>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-line mt-24">
        <div className="mx-auto max-w-7xl px-5 py-14 grid gap-10 md:grid-cols-4 text-sm">
          <div className="md:col-span-2 max-w-sm">
            <span className="display text-lg">{config.siteName}</span>
            <p className="text-muted mt-3">{config.tagline}</p>
            <p className="text-muted mt-4 text-xs">
              Over {config.minAge}s only. Please play responsibly. Free entry route available on every raffle.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-4">Raffles</p>
            <ul className="space-y-2.5 text-muted">
              <li><Link className="hover:text-fg" href="/#live">Live raffles</Link></li>
              <li><Link className="hover:text-fg" href="/#winners">Past winners</Link></li>
              {config.freeEntry.enabled && <li><Link className="hover:text-fg" href="/free-entry">Free postal entry</Link></li>}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4">Help</p>
            <ul className="space-y-2.5 text-muted">
              <li><Link className="hover:text-fg" href="/terms">Terms &amp; conditions</Link></li>
              <li><a className="hover:text-fg" href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-10 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted">
          <span>&copy; {new Date().getFullYear()} {config.legalName}</span>
          <span>Powered by <a className="hover:text-fg underline" href="https://github.com/kapoordeepanshu/openraffle">OpenRaffle</a></span>
        </div>
      </footer>
    </>
  );
}
