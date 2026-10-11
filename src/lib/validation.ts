import { z } from "zod";

export const entrySchema = z.object({
  raffleId: z.string().min(1),
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Please enter a valid email").max(160),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s()-]{5,}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(500),
  answer: z.string().max(200).optional(),
  ageConfirmed: z.literal(true, { errorMap: () => ({ message: "You must confirm your age" }) }),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
});

export type EntryForm = z.infer<typeof entrySchema>;

const cents = z.coerce.number().min(0).transform((v) => Math.round(v * 100));

export const raffleSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
      .min(3)
      .max(80),
    subtitle: z.string().trim().max(160).optional(),
    description: z.string().trim().min(10).max(5000),
    images: z.string().default(""),
    specs: z.string().default(""),
    prizeValue: cents.optional(),
    cashAlternative: cents.optional(),
    ticketPrice: cents.refine((v) => v >= 50, "Minimum ticket price is 0.50"),
    maxTickets: z.coerce.number().int().min(1).max(10_000_000),
    maxPerPerson: z.coerce.number().int().min(1).max(10_000),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    skillQuestion: z.string().trim().max(300).optional(),
    skillOptions: z.string().default(""),
    skillAnswer: z.string().trim().max(200).optional(),
  })
  .refine((r) => r.endsAt > r.startsAt, { message: "End must be after start", path: ["endsAt"] })
  .refine(
    (r) => !r.skillQuestion || r.skillOptions.split("\n").map((s) => s.trim()).includes(r.skillAnswer ?? ""),
    { message: "The correct answer must be one of the options", path: ["skillAnswer"] },
  );

/** "Label: value" lines -> [{label, value}] */
export function parseSpecLines(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i === -1 ? { label: l, value: "" } : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
    });
}

export const lines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);
