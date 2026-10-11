import { ImageResponse } from "next/og";
import { config } from "@/config";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { images } from "@/lib/raffle";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Raffle preview";

// Share card for each raffle: car photo, title, ticket price and prize value.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const r = await db.raffle.findFirst({ where: { slug: (await params).slug, status: { not: "DRAFT" } } });
  const img = r ? images(r)[0] : undefined;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0b0d", color: "#f4f5f7", position: "relative", fontFamily: "sans-serif" }}>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.replace("w=1600", "w=1200")} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover", opacity: 0.6 }} />
        )}
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, backgroundImage: "linear-gradient(90deg, rgba(10,11,13,0.95) 0%, rgba(10,11,13,0.75) 45%, rgba(10,11,13,0.15) 100%)", display: "flex" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 700 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e5262b", display: "flex" }} />
            {config.siteName.toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, color: "#e5262b", fontWeight: 700, letterSpacing: 4 }}>WIN THIS</div>
            <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, marginTop: 10, maxWidth: 900, textTransform: "uppercase" }}>{r?.title ?? config.siteName}</div>
            {r && (
              <div style={{ display: "flex", gap: 20, marginTop: 34, fontSize: 30 }}>
                <div style={{ background: "#e5262b", padding: "10px 24px", borderRadius: 999, fontWeight: 700 }}>{`${money(r.ticketPriceCents)} per ticket`}</div>
                {r.prizeValueCents ? <div style={{ border: "2px solid #e8c468", color: "#e8c468", padding: "8px 24px", borderRadius: 999 }}>{`Worth ${money(r.prizeValueCents)}`}</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
