import { AMBASSADOR_CAMPAIGN } from "./ambassadors";
import { PARTICIPANT_PORTAL_URL } from "./participants";
import { TRANSPORT_NOTICE, type EventRegistrationData, type UGX_GAMES } from "./validation/event-registration";

export interface RegistrationEmail extends Pick<EventRegistrationData, "registrationType" | "socials"> {
  id: string;
  to: string;
  fullName: string;
  phone: string;
  cnic: string;
  city: string;
  transport: "yes" | "no";
  ambassador?: string;
  ambassadorCode?: string;
  university?: string;
  slug: "ugx" | "hack-n-connect";
  eventTitle: string;
  isPreRegistration: boolean;
  game?: typeof UGX_GAMES[number];
  isTest?: boolean;
  portalPassword: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function registrationEmailContent(registration: RegistrationEmail) {
  const type = registration.isPreRegistration ? "Pre-registration" : "Registration";
  const heading = `${type} received`;
  const dates = `${AMBASSADOR_CAMPAIGN.dates} ${AMBASSADOR_CAMPAIGN.year}`;
  const game = registration.slug === "ugx" ? registration.game : undefined;
  const { registrationType, socials } = registration.slug === "hack-n-connect" ? registration : {};
  // Public HTTPS assets work in email clients; the local app URL may be localhost.
  const logoOrigin = "https://www.netronixgiki.com";
  const eventLogo = registration.slug === "ugx" ? "ugx" : "hnc";
  const details = [
    ["Event", registration.eventTitle],
    ["Dates", dates],
    ["Venue", "GIKI"],
    ...(game ? [["Game", game]] : []),
    ...(registrationType ? [["Registration type", registrationType]] : []),
    ...(socials ? [["Socials opt-in", socials]] : []),
    ["Reference", registration.id],
    ["Name", registration.fullName],
    ["Phone", registration.phone],
    ["Email", registration.to],
    ["CNIC", registration.cnic],
    ["City", registration.city],
    ["Ambassador", registration.ambassador?.trim() || "Not provided"],
    ...(registration.ambassadorCode ? [["Ambassador code", registration.ambassadorCode]] : []),
    ["University", registration.university?.trim() || "Not provided"],
    ["Transport", registration.transport === "yes" ? "Yes" : "No"],
  ];
  const accent = registration.slug === "ugx" ? "#ff7c89" : "#78b4ff";
  const testNote = "This is a test email. No event registration has been created.";
  return {
    subject: `${registration.isTest ? "[TEST] " : ""}${type} received — ${registration.eventTitle}`,
    textContent: [
      ...(registration.isTest ? [testNote, ""] : []),
      `Hello ${registration.fullName},`, "",
      `We have received your ${type.toLowerCase()} for ${registration.eventTitle}.`, "",
      `Participant portal: ${PARTICIPANT_PORTAL_URL}`,
      `Sign-in email: ${registration.to}`,
      `Portal password: ${registration.portalPassword}`,
      "Use the portal to view your registrations and upload your payment screenshot.", "",
      ...details.map(([label, value]) => `${label}: ${value}`), "",
      TRANSPORT_NOTICE, "",
      "Payment instructions will follow in a separate email once finalized.",
      "This email confirms receipt of your registration, not payment.", "",
      "Keep your reference when contacting the event team.", "", "NETRONiX Events",
    ].join("\n"),
    htmlContent: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;background:#050505;color:#eeeeef;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#141416;border:1px solid #414148;border-radius:20px"><tr><td style="padding:32px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border-bottom:1px solid #414148"><tr>
<td width="50%" align="left" valign="middle" style="padding:0 12px 8px 0"><img src="${logoOrigin}/brand/netronix-white.png" alt="NETRONiX" width="240" height="135" style="display:block;width:100%;max-width:240px;height:auto;border:0;color:#ffffff;font-size:18px"></td>
<td width="50%" align="right" valign="middle" style="padding:0 0 8px 12px"><img src="${logoOrigin}/brand/${eventLogo}.png" alt="${escapeHtml(registration.eventTitle)}" width="240" height="135" style="display:block;width:100%;max-width:240px;height:auto;border:0;color:${accent};font-size:18px"></td>
</tr></table>
${registration.isTest ? `<p style="color:${accent}">${testNote}</p>` : ""}
<h1 style="margin:0 0 24px;font-size:30px;line-height:1.2;font-weight:500;color:${accent}">${heading}.</h1>
<p style="line-height:1.7">Hello ${escapeHtml(registration.fullName)},</p>
<p style="line-height:1.7">We have received your ${type.toLowerCase()} for <strong>${escapeHtml(registration.eventTitle)}</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#1d1d23;border:1px solid #414148;border-radius:12px"><tr><td style="padding:20px">
<h2 style="margin:0 0 8px;font-size:20px;color:#ffffff">Participant Portal</h2>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#d4d4df">View your registration and upload your payment screenshot.</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;overflow-wrap:anywhere">Sign-in email: ${escapeHtml(registration.to)}</p>
<p style="margin:0 0 4px;font-size:13px;color:#d4d4df">Portal password</p>
<p style="margin:0 0 20px;font-family:Consolas,'Courier New',monospace;font-size:28px;line-height:1.3;color:#ffffff"><strong>${escapeHtml(registration.portalPassword)}</strong></p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" bgcolor="${accent}" style="border-radius:8px;mso-padding-alt:14px 20px">
<a href="${PARTICIPANT_PORTAL_URL}" style="display:inline-block;padding:14px 20px;border-radius:8px;background:${accent};color:#101015;font-size:15px;font-weight:bold;text-decoration:none;mso-padding-alt:0">Open Participant Portal</a>
</td></tr></table>
</td></tr></table>
<h2 style="margin:24px 0 0;font-size:18px;color:#ffffff">Registration details</h2>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border-top:1px solid #414148">${details.map(([label, value]) => `<tr><td style="padding:12px 12px 12px 0;border-bottom:1px solid #414148;color:#b9b9c3;font-size:13px;vertical-align:top">${label}</td><td style="padding:12px 0;border-bottom:1px solid #414148;font-size:13px;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("")}</table>
<p style="font-size:13px;line-height:1.7;color:#b9b9c3">${TRANSPORT_NOTICE}</p>
<p style="line-height:1.7">Payment instructions will follow in a separate email once finalized.</p>
<p style="font-size:13px;line-height:1.7;color:#b9b9c3">This email confirms receipt of your registration, not payment. Keep your reference when contacting the event team.</p>
<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #414148;font-size:12px;line-height:1.7;color:#b9b9c3">NETRONiX · Ghulam Ishaq Khan Institute of Engineering Sciences and Technology</p>
</td></tr></table></td></tr></table></body></html>`,
  };
}

export type RegistrationEmailResult =
  | { success: true; messageId: string }
  | { success: false; reason: "not_configured" | "provider_rejected" | "connection_failed" };

/** Server-side only: never expose these environment variables to client code. */
export async function sendRegistrationConfirmation(registration: RegistrationEmail): Promise<RegistrationEmailResult> {
  return sendParticipantEmail({
    ...registrationEmailContent(registration),
    id: registration.id,
    to: registration.to,
    fullName: registration.fullName,
    tags: ["event-registration", registration.slug],
  });
}

export async function sendParticipantEmail(message: {
  id: string;
  to: string;
  fullName?: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
  tags: string[];
}): Promise<RegistrationEmailResult> {
  const { id, to, fullName, ...content } = message;
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const email = process.env.BREVO_SENDER_EMAIL?.trim();
  const name = process.env.BREVO_SENDER_NAME?.trim() || "NETRONiX Events";
  if (!apiKey || !email) return { success: false, reason: "not_configured" };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { name, email },
        to: [{ email: to, name: fullName }],
        ...content,
        headers: { IdempotencyKey: id },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      // Brevo errors can echo recipients; log only status and an internal reference.
      console.error("[registration-email] Brevo rejected request", response.status, id);
      return { success: false, reason: "provider_rejected" };
    }
    const result: unknown = await response.json();
    if (typeof result !== "object" || result === null || !("messageId" in result) || typeof result.messageId !== "string" || !result.messageId) {
      return { success: false, reason: "provider_rejected" };
    }
    return { success: true, messageId: result.messageId };
  } catch {
    console.error("[registration-email] Brevo request failed", id);
    return { success: false, reason: "connection_failed" };
  }
}
