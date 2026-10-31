import { z } from "zod";
import { AmbassadorSchema } from "./ambassador";

export const UGX_GAMES = ["FC26", "Tekken 8"] as const;
const UgxGameSchema = z.enum(UGX_GAMES, { error: "Select FC26 or Tekken 8." });

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
  game: UgxGameSchema.optional(),
});

export function getEventRegistrationSchema(slug: string): z.ZodType<EventRegistrationData, EventRegistrationInput> {
  return EventRegistrationSchema.extend({
    game: slug === "ugx" ? UgxGameSchema : UgxGameSchema.optional(),
  });
}

/** Older registrations may not have a game selection. */
export function getUgxGame(formData: unknown): typeof UGX_GAMES[number] | null {
  const parsed = z.object({ game: UgxGameSchema }).safeParse(formData);
  return parsed.success ? parsed.data.game : null;
}

export type EventRegistrationInput = z.input<typeof EventRegistrationSchema>;
export type EventRegistrationData = z.output<typeof EventRegistrationSchema>;
