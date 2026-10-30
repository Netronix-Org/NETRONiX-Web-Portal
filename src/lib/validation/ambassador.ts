import { z } from "zod";

export const AmbassadorSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100, "Use 100 characters or fewer."),
  email: z.string().trim().toLowerCase().min(1, "Enter your email address.").max(150, "Use 150 characters or fewer.").email("Enter a valid email address."),
  cnic: z.string().trim()
    .regex(/^(?:\d{13}|\d{5}-\d{7}-\d)$/, "Enter a 13-digit CNIC, e.g. 12345-1234567-1.")
    .transform((value) => value.replace(/-/g, "")),
  phone: z.string().trim().max(25, "Enter a valid phone number.")
    .regex(/^\+?[\d\s()-]+$/, "Enter a valid phone number.")
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .refine((value) => /^\+?\d{10,15}$/.test(value), "Enter a phone number with 10–15 digits."),
  university: z.string().trim().min(2, "Enter your university's name.").max(200, "Use 200 characters or fewer."),
  participantCount: z.number({ error: "Enter the number of participants you expect to bring." })
    .int("Enter a whole number.").min(1, "Enter at least 1 participant.")
    .max(10000, "Enter 10,000 participants or fewer."),
});

export type AmbassadorInput = z.input<typeof AmbassadorSchema>;
