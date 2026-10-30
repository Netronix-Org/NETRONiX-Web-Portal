import { z } from "zod";
import { AmbassadorSchema } from "./ambassador";

/** HNC / UGX share the same contact validation as the ambassador call. */
export const EventRegistrationSchema = AmbassadorSchema.pick({
  fullName: true,
  phone: true,
  email: true,
  cnic: true,
}).extend({
  city: z.string().trim().min(2, "Enter your city.").max(100, "Use 100 characters or fewer."),
  ambassador: z.string().trim().max(100, "Use 100 characters or fewer.").optional(),
  university: z.string().trim().max(200, "Use 200 characters or fewer.").optional(),
});

export type EventRegistrationInput = z.input<typeof EventRegistrationSchema>;
export type EventRegistrationData = z.output<typeof EventRegistrationSchema>;
