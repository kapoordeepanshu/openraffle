import { config } from "@/config";

export function money(cents: number, currency = config.currency) {
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function dateTime(d: Date | string) {
  return new Intl.DateTimeFormat(config.locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

export function timeAgo(d: Date | string, now = Date.now()) {
  const s = Math.max(1, Math.round((now - new Date(d).getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(config.locale, { numeric: "auto" });
  if (s < 60) return rtf.format(-s, "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}

export function ticketNo(n: number) {
  return `#${String(n).padStart(5, "0")}`;
}

/** "Jane Smith" -> "Jane S." (used when showing winners publicly) */
export function publicName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
