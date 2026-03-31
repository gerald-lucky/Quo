import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/quo";
import { generateQualifyingMessage, type QualifyingParams } from "@/lib/claude";
import { normalizePhone } from "@/lib/facebook";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      adId: string;
      leads: { name?: string; phone: string; email?: string }[];
    };

    const { adId, leads } = body;

    if (!adId || !leads?.length) {
      return NextResponse.json({ error: "adId and leads are required." }, { status: 400 });
    }

    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }

    const results = [];

    for (const row of leads) {
      if (!row.phone) continue;

      // Normalize phone to E.164 (+1XXXXXXXXXX)
      row.phone = normalizePhone(row.phone) ?? row.phone;

      // Generate AI message
      let message: string;
      try {
        message = await generateQualifyingMessage({
          name: row.name,
          adName: ad.name,
          campaignName: ad.campaignName ?? undefined,
          businessContext: ad.businessContext ?? undefined,
          qualifyingParams: (ad.qualifyingParams as QualifyingParams) ?? undefined,
        });
      } catch {
        message = `Hi ${row.name ?? "there"}, thanks for your interest! We'll be in touch shortly.`;
      }

      // Send SMS
      const smsResult = await sendSMS(row.phone, message);

      // Save lead with a synthetic ID
      const fakeLeadId = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await prisma.lead.create({
        data: {
          facebookLeadId: fakeLeadId,
          adId: ad.id,
          name: row.name ?? null,
          email: row.email ?? null,
          phone: row.phone,
          messageSent: smsResult.success,
          messageSentAt: smsResult.success ? new Date() : null,
          messageError: smsResult.error ?? null,
          sentMessage: message,
        },
      });

      results.push({
        name: row.name,
        phone: row.phone,
        messageSent: smsResult.success,
        message,
        error: smsResult.error,
      });
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
