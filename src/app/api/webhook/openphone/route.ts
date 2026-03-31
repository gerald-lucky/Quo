import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/quo";
import { generateFollowUp, type QualifyingParams, type ConversationMessage } from "@/lib/claude";

/**
 * POST /api/webhook/openphone
 * Receives inbound messages from OpenPhone and triggers Claude follow-up replies.
 *
 * Set this URL in OpenPhone → Settings → Webhooks → message.received
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as OpenPhoneWebhookPayload;

    // Only handle inbound messages
    if (body.type !== "message.received") {
      return NextResponse.json({ ok: true });
    }

    const msg = body.data?.object;
    if (!msg || msg.direction !== "incoming") {
      return NextResponse.json({ ok: true });
    }

    const fromPhone = msg.from;
    const inboundText = msg.body;

    if (!fromPhone || !inboundText) {
      return NextResponse.json({ ok: true });
    }

    // Find lead by phone number
    const normalizedPhone = fromPhone.startsWith("+") ? fromPhone : `+${fromPhone}`;
    const lead = await prisma.lead.findFirst({
      where: { phone: { in: [fromPhone, normalizedPhone] } },
      include: {
        ad: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!lead) {
      console.log(`[OpenPhone] No lead found for phone ${fromPhone}`);
      return NextResponse.json({ ok: true });
    }

    // Skip if already fully qualified
    if (lead.qualificationStatus === "qualified" || lead.qualificationStatus === "not_qualified") {
      console.log(`[OpenPhone] Lead ${lead.id} already ${lead.qualificationStatus}. Skipping.`);
      return NextResponse.json({ ok: true });
    }

    // Save the inbound message
    await prisma.message.create({
      data: { leadId: lead.id, role: "user", content: inboundText },
    });

    // Build conversation history for Claude
    const history: ConversationMessage[] = [
      // Include the original outbound message as the first assistant message
      ...(lead.sentMessage ? [{ role: "assistant" as const, content: lead.sentMessage }] : []),
      ...lead.messages.map((m) => ({ role: m.role as "assistant" | "user", content: m.content })),
      { role: "user", content: inboundText },
    ];

    // Generate follow-up via Claude
    const { message: replyText, qualificationStatus } = await generateFollowUp(
      {
        name: lead.name ?? undefined,
        adName: lead.ad.name,
        campaignName: lead.ad.campaignName ?? undefined,
        businessContext: lead.ad.businessContext ?? undefined,
        qualifyingParams: (lead.ad.qualifyingParams as QualifyingParams) ?? undefined,
      },
      history
    );

    // Send reply via OpenPhone
    const phone = lead.phone!;
    const result = await sendSMS(phone, replyText);

    // Save the assistant reply
    await prisma.message.create({
      data: { leadId: lead.id, role: "assistant", content: replyText },
    });

    // Update lead qualification status
    await prisma.lead.update({
      where: { id: lead.id },
      data: { qualificationStatus },
    });

    if (result.success) {
      console.log(`[OpenPhone] Follow-up sent to ${phone}. Status: ${qualificationStatus}`);
    } else {
      console.error(`[OpenPhone] Follow-up failed for ${phone}: ${result.error}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[OpenPhone] Webhook error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to OpenPhone
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface OpenPhoneWebhookPayload {
  type: string;
  data?: {
    object?: {
      id?: string;
      from?: string;
      to?: string;
      body?: string;
      direction?: string;
    };
  };
}
