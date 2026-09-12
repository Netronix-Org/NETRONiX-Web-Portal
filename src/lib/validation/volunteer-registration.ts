/**
 * Volunteer Call registration schema.
 *
 * This event's form mirrors the society's Google Form 1:1 (Faculty, essay
 * questions, a society-membership check, and ten 1-5 skill ratings) instead
 * of the shared registration fields every other event uses. Kept separate
 * from `registration.ts` so the generic form and its schema stay untouched.
 */

import { z } from "zod";

export const VOLUNTEER_BATCH_OPTIONS = [35, 36] as const;

export const SKILL_RATING_CATEGORIES = [
  { key: "networking", label: "Internet Networking Knowledge" },
  { key: "photoshopCanva", label: "Photoshop/Canva" },
  { key: "gaming", label: "Gaming" },
  { key: "sponsorship", label: "Sponsorship" },
  { key: "liason", label: "Liason" },
  { key: "videoEditing", label: "Video Editing" },
  { key: "softwareDevelopment", label: "Software Development" },
  { key: "leadership", label: "Leadership" },
  { key: "artisticSkills", label: "Artistic Skills" },
  { key: "persuasion", label: "Persuasion" },
] as const;

export type SkillRatingKey = (typeof SKILL_RATING_CATEGORIES)[number]["key"];

/** A required multiple-choice field, kept as a plain string so an unselected
 * default ("") type-checks — matches the Google Form's behaviour of never
 * pre-selecting an answer. */
function requiredChoice(allowed: readonly string[], message: string) {
  return z.string().refine((v) => allowed.includes(v), { message });
}

const ratingField = requiredChoice(["1", "2", "3", "4", "5"], "Rate this skill");

const skillRatingsShape = Object.fromEntries(
  SKILL_RATING_CATEGORIES.map((c) => [c.key, ratingField])
) as Record<SkillRatingKey, typeof ratingField>;

export const VolunteerRegistrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name")
      .max(100, "That name is too long"),

    registrationNumber: z
      .string()
      .trim()
      .min(4, "Please enter your registration number")
      .max(30, "That registration number is too long")
      .regex(/^[A-Za-z0-9\-/]+$/, "Use letters, numbers, dashes and slashes only"),

    phone: z
      .string()
      .trim()
      .min(7, "Please enter your contact number")
      .max(20, "That number is too long")
      .regex(/^[0-9+\-\s()]+$/, "Use digits, spaces, +, - and () only"),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Please enter your email")
      .max(150, "That email is too long")
      .email("Enter a valid email address"),

    faculty: z
      .string()
      .trim()
      .min(2, "Please enter your faculty")
      .max(100, "That is too long"),

    batch: requiredChoice(
      VOLUNTEER_BATCH_OPTIONS.map(String),
      "Select your batch"
    ),

    weaknesses: z
      .string()
      .trim()
      .min(5, "List a few of your weaknesses")
      .max(1000, "Keep this under 1000 characters"),

    strengths: z
      .string()
      .trim()
      .min(5, "List a few of your strengths")
      .max(1000, "Keep this under 1000 characters"),

    whyApply: z
      .string()
      .trim()
      .min(10, "Tell us a little more — at least 10 characters")
      .max(2000, "Keep this under 2000 characters"),

    regret: z
      .string()
      .trim()
      .min(3, "Please answer this question")
      .max(1000, "Keep this under 1000 characters"),

    otherSociety: requiredChoice(["yes", "no"], "Please select yes or no"),

    otherSocietyList: z
      .string()
      .trim()
      .max(500, "Keep this under 500 characters")
      .optional()
      .or(z.literal("")),

    skillRatings: z.object(skillRatingsShape),
  })
  // If they're a member of another society, they have to name it.
  .refine(
    (data) => data.otherSociety !== "yes" || Boolean(data.otherSocietyList?.trim()),
    {
      message: "List the societies you're part of, in order of preference",
      path: ["otherSocietyList"],
    }
  );

export type VolunteerRegistrationInput = z.infer<typeof VolunteerRegistrationSchema>;

/** The shape stored in `registrations.form_data` for this event. */
export interface VolunteerFormData {
  faculty: string;
  weaknesses: string;
  strengths: string;
  whyApply: string;
  regret: string;
  otherSociety: boolean;
  otherSocietyList: string | null;
  skillRatings: Record<SkillRatingKey, number>;
}

/** Narrow an unknown `Registration.formData` JSON value into the volunteer shape. */
export function isVolunteerFormData(value: unknown): value is VolunteerFormData {
  return (
    typeof value === "object" &&
    value !== null &&
    "faculty" in value &&
    "skillRatings" in value
  );
}

export const EMPTY_VOLUNTEER_REGISTRATION: VolunteerRegistrationInput = {
  fullName: "",
  registrationNumber: "",
  phone: "",
  email: "",
  faculty: "",
  batch: "",
  weaknesses: "",
  strengths: "",
  whyApply: "",
  regret: "",
  otherSociety: "",
  otherSocietyList: "",
  skillRatings: Object.fromEntries(
    SKILL_RATING_CATEGORIES.map((c) => [c.key, ""])
  ) as unknown as VolunteerRegistrationInput["skillRatings"],
};
