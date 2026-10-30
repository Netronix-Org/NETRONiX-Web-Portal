import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AmbassadorSchema } from "@/lib/validation/ambassador";
import { AMBASSADOR_CAMPAIGN, isAmbassadorCallOpen } from "@/lib/ambassadors";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(`ambassadors:${getClientIp(req)}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many attempts. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.resetInSecs) } }
    );
  }

  if (!isAmbassadorCallOpen()) {
    return NextResponse.json({ message: "This ambassador call has closed." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = AmbassadorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      message: "Please check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  try {
    const result = await prisma.ambassadorApplication.createMany({
      data: { ...parsed.data, campaign: AMBASSADOR_CAMPAIGN.id },
      skipDuplicates: true,
    });
    if (result.count === 0) {
      return NextResponse.json({ message: "An application with this CNIC has already been received for HNC & UGX. For changes, contact the event team below." }, { status: 409 });
    }
    return NextResponse.json({ message: "Your ambassador application has been received." }, { status: 201 });
  } catch {
    // Do not log the Prisma error: it can contain the applicant's CNIC and phone.
    return NextResponse.json({ message: "We couldn't save your application. Your details are still here; please try again." }, { status: 503 });
  }
}
