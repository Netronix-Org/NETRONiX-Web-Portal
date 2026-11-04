import { z } from "zod";
import { AmbassadorSchema } from "./ambassador";

export const UGX_GAMES = ["FC26", "Tekken 8"] as const;
const UgxGameSchema = z.enum(UGX_GAMES, { error: "Select FC26 or Tekken 8." });
const TransportSchema = z.enum(["yes", "no"], { error: "Choose whether you would like to avail transport." });
const AmbassadorCodeSchema = z.string().regex(/^\d{4}$/, "Enter a four-digit ambassador code.");
const HncChoicesSchema = z.object({
  registrationType: z.enum(["Participant", "Observer"], { error: "Choose Participant or Observer." }),
  socials: z.enum(["Yes", "No"], { error: "Choose whether you want to opt in for socials." }),
});
export const TRANSPORT_NOTICE = "For now, transport is available from Islamabad, Peshawar and Haripur only.";

/** HNC / UGX share the same contact validation as the ambassador call. */
export const EventRegistrationSchema = AmbassadorSchema.pick({
  fullName: true,
  phone: true,
  email: true,
  cnic: true,
}).extend({
  city: z.string().trim().min(2, "Enter your city.").max(100, "Use 100 characters or fewer."),
  ambassador: z.string().trim().max(100, "Use 100 characters or fewer.").optional(),
  ambassadorCode: z.string().trim().pipe(AmbassadorCodeSchema.or(z.literal(""))).optional(),
  university: z.string().trim().max(200, "Use 200 characters or fewer.").optional(),
  game: UgxGameSchema.optional(),
  transport: TransportSchema,
  ...HncChoicesSchema.partial().shape,
});

export function getEventRegistrationSchema(slug: string): z.ZodType<EventRegistrationData, EventRegistrationInput> {
  if (slug === "hack-n-connect") return EventRegistrationSchema.extend(HncChoicesSchema.shape);
  if (slug === "ugx") {
    return EventRegistrationSchema.omit({ registrationType: true, socials: true }).extend({ game: UgxGameSchema });
  }
  return EventRegistrationSchema;
}

export function getHncChoices(formData: unknown): Partial<z.output<typeof HncChoicesSchema>> {
  const parsed = HncChoicesSchema.partial().safeParse(formData);
  return parsed.success ? parsed.data : {};
}

export function getAmbassadorCode(formData: unknown): string | null {
  const parsed = z.object({ ambassadorCode: AmbassadorCodeSchema }).safeParse(formData);
  return parsed.success ? parsed.data.ambassadorCode : null;
}

/** Older registrations may not have a game selection. */
export function getUgxGame(formData: unknown): typeof UGX_GAMES[number] | null {
  const parsed = z.object({ game: UgxGameSchema }).safeParse(formData);
  return parsed.success ? parsed.data.game : null;
}

/** Missing historic answers stay distinct from an explicit No. */
export function getTransportPreference(formData: unknown): "Yes" | "No" | null {
  const parsed = z.object({ transport: TransportSchema }).safeParse(formData);
  return parsed.success ? (parsed.data.transport === "yes" ? "Yes" : "No") : null;
}

export type EventRegistrationInput = z.input<typeof EventRegistrationSchema>;
export type EventRegistrationData = z.output<typeof EventRegistrationSchema>;
