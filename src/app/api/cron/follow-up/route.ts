import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/quo";
import { generateFollowUpNudge, type QualifyingParams } from "@/lib/claude";

const MAX_FOLLOW_UPS = 3;
const FOLLOW_UP_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * GET /api/cron/follow-up
 * Called by Vercel Cron every hour. Sends follow-up messages to leads that
 * haven't replied in 24 hours (up to 3 times).
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - FOLLOW_UP_DELAY_MS);

  // Find leads that:
  // - Had initial message sent
  // - Are not yet qualified or not_qualified
  // - Have not yet hit max follow-ups
  const candidates = await prisma.lead.findMany({
    where: {
      messageSent: true,
      followUpCount: { lt: MAX_FOLLOW_UPS },
      qualificationStatus: { notIn: ["qualified", "not_qualified"] },
      phone: { not: null },
    },
    include: {
      ad: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const toFollowUp = candidates.filter((lead) => {
    const lastMessage = lead.messages[0];
    // Determine the timestamp and role of the last message in the conversation
    const lastActivityAt: Date = lastMessage?.createdAt ?? lead.messageSentAt ?? lead.createdAt;
    const lastRole: string = lastMessage?.role ?? "assistant"; // initial sent msg counts as assistant

    // Only follow up if last message was from us (assistant) and it's been 24h+
    return lastRole === "assistant" && lastActivityAt < cutoff;
  });

  console.log(`[Cron] ${toFollowUp.length} leads need a follow-up (of ${candidates.length} checked)`);

  let sent = 0;
  let failed = 0;

  for (const lead of toFollowUp) {
    try {
      const nextFollowUp = lead.followUpCount + 1;
      const message = await generateFollowUpNudge(
        {
          name: lead.name ?? undefined,
          adName: lead.ad.name,
          campaignName: lead.ad.campaignName ?? undefined,
          businessContext: lead.ad.businessContext ?? undefined,
          qualifyingParams: (lead.ad.qualifyingParams as QualifyingParams) ?? undefined,
        },
        nextFollowUp
      );

      const result = await sendSMS(lead.phone!, message);

      if (result.success) {
        // Save the follow-up as an assistant message and increment the counter
        await prisma.message.create({
          data: { leadId: lead.id, role: "assistant", content: message },
        });
        await prisma.lead.update({
          where: { id: lead.id },
          data: { followUpCount: nextFollowUp },
        });
        console.log(`[Cron] Follow-up #${nextFollowUp} sent to ${lead.phone} (${lead.name})`);
        sent++;
      } else {
        console.error(`[Cron] Failed to send follow-up to ${lead.phone}: ${result.error}`);
        failed++;
      }
    } catch (err) {
      console.error(`[Cron] Error processing lead ${lead.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: toFollowUp.length });
}
