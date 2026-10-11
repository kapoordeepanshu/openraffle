import type { Order, Raffle, Ticket } from "@prisma/client";
import { config } from "@/config";
import { dateTime, money, ticketNo } from "./format";
import type { ReceiptData } from "./receipt";

export function receiptDataFor(order: Order & { raffle: Raffle; tickets: Ticket[] }): ReceiptData {
  return {
    siteName: config.siteName,
    legalName: config.legalName,
    supportEmail: config.supportEmail,
    siteUrl: config.siteUrl,
    reference: order.reference,
    raffleTitle: order.raffle.title,
    drawDate: dateTime(order.raffle.endsAt),
    name: order.name,
    email: order.email,
    purchasedAt: dateTime(order.paidAt ?? order.createdAt),
    quantity: order.quantity,
    unitPrice: order.amountCents ? money(order.raffle.ticketPriceCents) : money(0),
    total: money(order.amountCents),
    source: order.source,
    ticketNumbers: order.tickets.map((t) => ticketNo(t.number)),
    skillCorrect: order.skillCorrect,
  };
}
