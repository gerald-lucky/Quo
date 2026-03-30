import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchLeadData, extractField, extractName, verifyWebhookSignature } from "@/lib/facebook";
import { sendSMS } from "@/lib/quo";

/**
 * GET /api/webhook/facebook
 * Facebook webhook verification challenge.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    console.log("[Webhook] Facebook webhook verified.");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[Webhook] Webhook verification failed. Token mismatch.");
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST /api/webhook/facebook
 * Receives Facebook Lead Ads events and triggers SMS via Quo.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify signature
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const isValid = await verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn("[Webhook] Invalid signature — rejecting request.");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: FacebookWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as FacebookWebhookPayload;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Facebook requires a 200 response quickly; process async
  processLeadEvents(payload).catch((err) =>
    console.error("[Webhook] processLeadEvents error:", err)
  );

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface FacebookWebhookPayload {
  object: string;
  entry: FacebookEntry[];
}

interface FacebookEntry {
  id: string;
  time: number;
  changes: FacebookChange[];
}

interface FacebookChange {
  field: string;
  value: {
    leadgen_id: string;
    form_id: string;
    ad_id?: string;
    adgroup_id?: string;
    page_id: string;
    created_time: number;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Processing
// ──────────────────────────────────────────────────────────────────────────────

async function processLeadEvents(payload: FacebookWebhookPayload) {
  if (payload.object !== "page") return;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "leadgen") continue;

      const { leadgen_id, form_id } = change.value;

      // Find matching registered ad by form ID
      const ad = await prisma.ad.findUnique({
        where: { facebookFormId: form_id, isActive: true },
      });

      if (!ad) {
        console.log(`[Webhook] No active ad found for form_id=${form_id}. Skipping.`);
        continue;
      }

      // Avoid duplicate processing
      const existing = await prisma.lead.findUnique({
        where: { facebookLeadId: leadgen_id },
      });
      if (existing) {
        console.log(`[Webhook] Lead ${leadgen_id} already processed.`);
        continue;
      }

      // Fetch full lead data from Facebook
      const leadData = await fetchLeadData(leadgen_id);
      if (!leadData) {
        console.error(`[Webhook] Could not fetch lead data for ${leadgen_id}`);
        continue;
      }

      const name = extractName(leadData.field_data);
      const email = extractField(leadData.field_data, "email");
      const phone =
        extractField(leadData.field_data, "phone_number") ??
        extractField(leadData.field_data, "phone");

      // Personalize the message template
      const message = ad.messageTemplate
        .replace(/\{\{name\}\}/gi, name ?? "there")
        .replace(/\{\{email\}\}/gi, email ?? "")
        .replace(/\{\{ad\}\}/gi, ad.name)
        .replace(/\{\{campaign\}\}/gi, ad.campaignName ?? "");

      // Send SMS via Quo
      let messageSent = false;
      let messageError: string | undefined;
      let messageSentAt: Date | undefined;

      if (phone) {
        const result = await sendSMS(phone, message);
        messageSent = result.success;
        messageError = result.error;
        messageSentAt = result.success ? new Date() : undefined;

        if (result.success) {
          console.log(`[Webhook] SMS sent to ${phone} for lead ${leadgen_id}`);
        } else {
          console.error(`[Webhook] SMS failed for ${leadgen_id}: ${result.error}`);
        }
      } else {
        messageError = "No phone number in lead data";
        console.warn(`[Webhook] No phone for lead ${leadgen_id}`);
      }

      // Persist lead
      await prisma.lead.create({
        data: {
          facebookLeadId: leadgen_id,
          adId: ad.id,
          name,
          email,
          phone,
          messageSent,
          messageSentAt,
          messageError,
          rawData: JSON.parse(JSON.stringify(leadData)),
        },
      });
    }
  }
}
