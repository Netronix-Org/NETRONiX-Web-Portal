import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAmbassadorSession } from "@/lib/ambassador-session";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getParticipantEmail } from "@/lib/participant-session";
import { readPaymentImage, paymentStorageFetch, removePaymentProof } from "@/lib/payment-storage";
import { PARTICIPANT_EVENT_SLUGS, PAYMENT_BUCKET, PAYMENT_IMAGE_TYPES } from "@/lib/participants";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAmbassadorCode } from "@/lib/validation/event-registration";

export const maxDuration = 45;
type Context = { params: Promise<{ id: string }> };
const event = { slug: { in: PARTICIPANT_EVENT_SLUGS } };
const privateHeaders = { "Cache-Control": "private, no-store" };
const notFound = () => NextResponse.json({ message: "Payment record not found." }, { status: 404 });

export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const [email, ambassador, admin] = await Promise.all([
      getParticipantEmail(), getAmbassadorSession(), getAuthenticatedAdmin(req),
    ]);
    if (!email && !ambassador && admin?.role !== "ADMIN") return notFound();
    const registration = await prisma.registration.findFirst({
      where: { id, event },
      select: { email: true, formData: true, paymentProofPath: true },
    });
    if (!registration?.paymentProofPath) return notFound();
    const ownsRegistration = email === registration.email.toLowerCase();
    const referred = ambassador && getAmbassadorCode(registration.formData) === String(ambassador.code);
    if (!ownsRegistration && !referred && admin?.role !== "ADMIN") return notFound();

    const response = await paymentStorageFetch(`object/authenticated/${PAYMENT_BUCKET}/${registration.paymentProofPath}`);
    const type = response.headers.get("content-type") ?? "";
    if (response.status === 404) return notFound();
    if (!response.ok || !PAYMENT_IMAGE_TYPES.includes(type)) throw new Error("Storage response unavailable");
    const extension = type === "image/jpeg" ? "jpg" : type.split("/")[1];
    const download = req.nextUrl.searchParams.get("download") === "1";
    return new NextResponse(response.body, {
      headers: {
        ...privateHeaders,
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": download ? `attachment; filename="payment-screenshot.${extension}"` : "inline",
      },
    });
  } catch {
    return NextResponse.json({ message: "Couldn't load the screenshot. Try again." }, { status: 503 });
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const email = await getParticipantEmail();
    if (!email) return NextResponse.json({ message: "Sign in to upload a screenshot." }, { status: 401 });
    const owner = { id, email: { equals: email, mode: "insensitive" as const }, event };
    const registration = await prisma.registration.findFirst({
      where: owner,
      select: { paymentPaid: true, paymentProofPath: true },
    });
    if (!registration) return notFound();
    if (registration.paymentPaid) return NextResponse.json({ message: "This payment has already been marked paid." }, { status: 409 });

    const limit = checkRateLimit(`participant-proof:${email}`, { limit: 12, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ message: "Too many uploads. Try again later." }, { status: 429 });
    const image = await readPaymentImage(req);
    if (!image) return NextResponse.json({ message: "Choose a PNG, JPEG or WebP screenshot up to 3 MB." }, { status: 400 });

    const path = `${id}/${randomUUID()}.${image.extension}`;
    const upload = await paymentStorageFetch(`object/${PAYMENT_BUCKET}/${path}`, {
      method: "POST",
      headers: { "Content-Type": image.type, "Cache-Control": "no-store" },
      body: image.bytes,
    });
    if (!upload.ok) throw new Error("Storage upload failed");

    let updated: { count: number };
    try {
      updated = await prisma.registration.updateMany({
        where: { ...owner, paymentPaid: false, paymentProofPath: registration.paymentProofPath },
        data: { paymentProofPath: path },
      });
    } catch (error) {
      // A lost database response may have committed the update. Check before deleting the object.
      const saved = await prisma.registration.findFirst({ where: owner, select: { paymentProofPath: true } });
      if (saved?.paymentProofPath !== path) {
        await removePaymentProof(path);
        throw error;
      }
      updated = { count: 1 };
    }
    if (updated.count === 0) {
      await removePaymentProof(path);
      return NextResponse.json({ message: "The payment record changed. Refresh the page and try again." }, { status: 409 });
    }
    if (registration.paymentProofPath) await removePaymentProof(registration.paymentProofPath);
    return NextResponse.json({ uploaded: true }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ message: "Couldn't save the screenshot. Try again." }, { status: 503 });
  }
}

const ProofRemoval = z.object({ expectedProofPath: z.string().min(1).max(120) });

export async function DELETE(req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const email = await getParticipantEmail();
    if (!email) return NextResponse.json({ message: "Sign in to remove a screenshot." }, { status: 401 });
    const parsed = ProofRemoval.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid screenshot removal request." }, { status: 400 });

    const owner = { id, email: { equals: email, mode: "insensitive" as const }, event };
    const registration = await prisma.registration.findFirst({
      where: owner,
      select: { paymentPaid: true, paymentProofPath: true },
    });
    if (!registration) return notFound();
    if (registration.paymentPaid) return NextResponse.json({ message: "This payment has already been marked paid." }, { status: 409 });
    if (!registration.paymentProofPath) return new NextResponse(null, { status: 204, headers: privateHeaders });

    const { expectedProofPath } = parsed.data;
    const removed = await prisma.registration.updateMany({
      where: { ...owner, paymentPaid: false, paymentProofPath: expectedProofPath },
      data: { paymentProofPath: null },
    });
    if (!removed.count) {
      return NextResponse.json({ message: "The payment record changed. Refresh the page and try again." }, { status: 409 });
    }
    await removePaymentProof(expectedProofPath);
    return new NextResponse(null, { status: 204, headers: privateHeaders });
  } catch {
    return NextResponse.json({ message: "Couldn't remove the screenshot. Try again." }, { status: 503 });
  }
}

const PaymentUpdate = z.object({
  paid: z.boolean(),
  expectedProofPath: z.string().max(120).nullable(),
});

export async function PATCH(req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) return NextResponse.json({ message: "Sign in to review payments." }, { status: 401 });
    if (admin.role !== "ADMIN") return NextResponse.json({ message: "Executive admin access required." }, { status: 403 });
    const parsed = PaymentUpdate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid payment status update." }, { status: 400 });
    const result = await prisma.registration.updateMany({
      where: { id, event, paymentProofPath: parsed.data.expectedProofPath },
      data: { paymentPaid: parsed.data.paid },
    });
    if (!result.count) return NextResponse.json({ message: "The payment record changed. Refresh the list and try again." }, { status: 409 });
    return NextResponse.json({ paid: parsed.data.paid }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ message: "Couldn't update the payment status." }, { status: 503 });
  }
}
