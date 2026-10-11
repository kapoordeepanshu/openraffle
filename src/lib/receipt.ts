import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type ReceiptData = {
  siteName: string;
  legalName: string;
  supportEmail: string;
  siteUrl: string;
  reference: string;
  raffleTitle: string;
  drawDate: string;
  name: string;
  email: string;
  purchasedAt: string;
  quantity: number;
  unitPrice: string;
  total: string;
  source: string;
  ticketNumbers: string[];
  skillCorrect: boolean;
};

const INK = rgb(0.07, 0.08, 0.1);
const MUTED = rgb(0.42, 0.45, 0.5);
const ACCENT = rgb(0.86, 0.15, 0.15);
const LINE = rgb(0.88, 0.89, 0.91);

function wrapTickets(nums: string[], font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const n of nums) {
    const next = line ? `${line}   ${n}` : n;
    if (font.widthOfTextAtSize(next, size) > width) {
      lines.push(line);
      line = n;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Builds an A4 PDF entry receipt. Multi-page when an order has many tickets. */
export async function buildReceiptPdf(d: ReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Entry receipt ${d.reference}`);
  pdf.setAuthor(d.siteName);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28, H = 841.89, M = 56;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  const text = (s: string, x: number, size = 10, font = regular, color = INK) => page.drawText(s, { x, y, size, font, color });

  // header band
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: ACCENT });
  text(d.siteName.toUpperCase(), M, 11, bold);
  const label = "ENTRY RECEIPT";
  page.drawText(label, { x: W - M - bold.widthOfTextAtSize(label, 9), y, size: 9, font: bold, color: ACCENT });
  y -= 48;
  text(d.raffleTitle, M, 22, bold);
  y -= 22;
  text(`Draw date: ${d.drawDate}`, M, 11, regular, MUTED);
  y -= 34;

  // details grid
  const rows: [string, string][] = [
    ["Reference", d.reference],
    ["Name", d.name],
    ["Email", d.email],
    ["Date", d.purchasedAt],
    ["Entry type", d.source === "FREE" ? "Free postal entry" : d.source === "MANUAL" ? "Manual entry" : "Online purchase"],
    ["Tickets", `${d.quantity} x ${d.unitPrice}`],
    ["Total paid", d.total],
  ];
  page.drawLine({ start: { x: M, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 1, color: LINE });
  for (const [k, v] of rows) {
    text(k, M, 10, regular, MUTED);
    text(v, M + 140, 10, k === "Total paid" ? bold : regular);
    y -= 22;
  }
  page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 1, color: LINE });
  y -= 22;

  if (!d.skillCorrect) {
    page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 26, color: rgb(1, 0.95, 0.95) });
    text("Your answer to the qualifying question was incorrect, so these tickets are not eligible for the draw.", M + 10, 9, regular, ACCENT);
    y -= 40;
  }

  text(`Your ticket number${d.ticketNumbers.length === 1 ? "" : "s"}`, M, 12, bold);
  y -= 22;
  const lines = wrapTickets(d.ticketNumbers, bold, 12, W - 2 * M);
  for (const l of lines) {
    if (y < M + 60) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
    text(l, M, 12, bold);
    y -= 20;
  }

  // footer on every page
  for (const p of pdf.getPages()) {
    p.drawText(`${d.legalName} · ${d.supportEmail} · ${d.siteUrl}`, { x: M, y: 36, size: 8, font: regular, color: MUTED });
    p.drawText("Keep this receipt. Ticket numbers are also stored securely against your order reference.", {
      x: M, y: 24, size: 8, font: regular, color: MUTED,
    });
  }
  return pdf.save();
}
