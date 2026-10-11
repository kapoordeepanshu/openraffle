import { config } from "@/config";
import { db } from "./db";
import { buildReceiptPdf } from "./receipt";
import { receiptDataFor } from "./receipt-data";
import { ticketNo } from "./format";

/**
 * Emails the PDF receipt when SMTP_URL is configured (e.g. smtp://user:pass@smtp.example.com:587).
 * Silently skipped otherwise; customers can always download the receipt from their order page.
 */
export async function sendReceiptEmail(orderId: string) {
  if (!process.env.SMTP_URL) return false;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { raffle: true, tickets: { orderBy: { number: "asc" } } },
  });
  if (!order) return false;

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  const pdf = await buildReceiptPdf(receiptDataFor(order));
  const link = `${config.siteUrl}/orders/${order.id}?token=${order.accessToken}`;
  const numbers = order.tickets.map((t) => ticketNo(t.number)).join(", ");

  await transport.sendMail({
    from: process.env.MAIL_FROM ?? `${config.siteName} <${config.supportEmail}>`,
    to: order.email,
    subject: `Your entry for ${order.raffle.title} (${order.reference})`,
    text: `Hi ${order.name},\n\nThanks for entering ${order.raffle.title}.\nYour ticket numbers: ${numbers}\n\nView your entry: ${link}\n\nGood luck!\n${config.siteName}`,
    attachments: [{ filename: `receipt-${order.reference}.pdf`, content: Buffer.from(pdf) }],
  });
  return true;
}
