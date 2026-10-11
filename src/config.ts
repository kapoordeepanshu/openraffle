/**
 * White-label settings. Every business running OpenRaffle sets these via
 * environment variables, so no code changes are needed to rebrand.
 */
const env = process.env;

const bool = (v: string | undefined, fallback: boolean) =>
  v === undefined ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase());

export const config = {
  siteName: env.SITE_NAME ?? "Apex Motor Draws",
  siteUrl: (env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  tagline: env.SITE_TAGLINE ?? "Win your dream car for the price of a coffee.",
  legalName: env.LEGAL_NAME ?? "Apex Motor Draws Ltd",
  supportEmail: env.SUPPORT_EMAIL ?? "support@example.com",
  currency: (env.CURRENCY ?? "gbp").toLowerCase(),
  locale: env.LOCALE ?? "en-GB",
  minAge: Number(env.MIN_AGE ?? 18),

  /** Free postal entry route (required in the UK and for US sweepstakes) */
  freeEntry: {
    enabled: bool(env.FREE_ENTRY_ENABLED, true),
    address: env.FREE_ENTRY_ADDRESS ?? "Apex Motor Draws, Free Entry, 1 Example Street, London, EC1A 1AA",
  },

  /** Minutes a pending checkout holds its tickets before they are released */
  reservationMinutes: Number(env.RESERVATION_MINUTES ?? 30),
};

export type Config = typeof config;
