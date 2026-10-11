import { config } from "@/config";
import { mask } from "@/lib/crypto";
import { getStripeSettings, paymentsMode } from "@/lib/settings";
import { createWebhook, disconnectStripe, testStripe } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import { CopyField, PaymentsForm } from "@/components/admin/payments-form";
import { PageHeader } from "@/components/admin/ui";

const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
];

export default async function PaymentsSettings() {
  const [s, mode] = await Promise.all([getStripeSettings(true), paymentsMode()]);
  const webhookUrl = `${config.siteUrl}/api/webhooks/stripe`;
  const status =
    mode === "demo"
      ? { tone: "border-warn/40 bg-warn/10", title: "Not connected: demo mode", body: "Checkouts are simulated. Add your Stripe secret key to take real payments." }
      : s.keyMode === "live"
        ? { tone: "border-ok/40 bg-ok/10", title: "Connected: live mode", body: "Real cards are being charged." }
        : { tone: "border-ok/40 bg-ok/10", title: "Connected: test mode", body: "Use Stripe test cards (4242 4242 4242 4242). Switch to live keys when you launch." };

  return (
    <>
      <PageHeader title="Payments" subtitle="Connect your Stripe account to accept card, Apple Pay and Google Pay payments." />

      <div className={`rounded-2xl border p-5 mb-8 flex flex-wrap items-center justify-between gap-4 ${status.tone}`}>
        <div>
          <p className="font-semibold">{status.title}</p>
          <p className="text-sm text-muted mt-1">
            {status.body}
            {s.source === "env" && " Keys are coming from environment variables; saving here overrides them."}
          </p>
        </div>
        {s.secretKey && (
          <div className="flex flex-wrap gap-3 items-start">
            <ActionButton action={testStripe} fields={{}} label="Test connection" />
            {s.source === "admin" && <ActionButton action={disconnectStripe} fields={{}} label="Disconnect" variant="danger" confirm="Remove the saved Stripe keys? Checkout will fall back to demo mode unless env keys are set." />}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <PaymentsForm masked={{ secretKey: mask(s.secretKey), webhookSecret: mask(s.webhookSecret), publishableKey: mask(s.publishableKey) }} />

        <div className="card p-6 space-y-5">
          <div>
            <h2 className="display text-lg">Webhook</h2>
            <p className="text-xs text-muted mt-1">Stripe tells OpenRaffle when a payment succeeds, so tickets are issued even if the customer closes their browser.</p>
          </div>
          <div>
            <p className="label">Endpoint URL</p>
            <CopyField value={webhookUrl} />
          </div>
          <div>
            <p className="label">Events to send</p>
            <ul className="text-xs font-mono text-muted space-y-1">{EVENTS.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
          <div className="border-t border-line pt-5 space-y-3">
            <p className="text-sm">
              <strong>Easiest:</strong> save your secret key, then let us create the webhook in your Stripe account and store its signing secret automatically.
            </p>
            {s.secretKey ? (
              <ActionButton action={createWebhook} fields={{}} label="Create webhook for me" variant="primary" />
            ) : (
              <p className="text-xs text-muted">Add a secret key first.</p>
            )}
            <p className="text-xs text-muted">
              Webhook secret: {s.webhookSecret ? <span className="text-ok">set ({mask(s.webhookSecret)})</span> : <span className="text-warn">not set</span>}.
              Testing locally? Run <code>stripe listen --forward-to localhost:3000/api/webhooks/stripe</code> and paste the whsec_ it prints.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
