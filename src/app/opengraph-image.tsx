import { ImageResponse } from "next/og";
import { config } from "@/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = config.siteName;

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, backgroundColor: "#0a0b0d", backgroundImage: "radial-gradient(circle at 80% 20%, #3a0d0f 0%, #0a0b0d 55%)", color: "#f4f5f7", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e5262b", display: "flex" }} />
          {config.siteName.toUpperCase()}
        </div>
        <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, marginTop: 40, maxWidth: 1000, textTransform: "uppercase" }}>{config.tagline}</div>
        <div style={{ fontSize: 30, color: "#9aa1ac", marginTop: 36 }}>Car raffles · Secure Stripe checkout · Instant PDF receipts</div>
      </div>
    ),
    size,
  );
}
