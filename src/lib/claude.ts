import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface QualifyingParams {
  monthlyBudget?: boolean;
  moveInDate?: boolean;
  rentOrBuy?: boolean;
  customQuestions?: string[];
}

export interface LeadContext {
  name?: string;
  adName: string;
  campaignName?: string;
  businessContext?: string;
  qualifyingParams?: QualifyingParams;
}

export async function generateQualifyingMessage(lead: LeadContext): Promise<string> {
  const qualifiers: string[] = [];

  if (lead.qualifyingParams?.monthlyBudget) {
    qualifiers.push("their monthly budget");
  }
  if (lead.qualifyingParams?.moveInDate) {
    qualifiers.push("when they are expecting to move");
  }
  if (lead.qualifyingParams?.rentOrBuy) {
    qualifiers.push("whether they want to rent or buy");
  }
  if (lead.qualifyingParams?.customQuestions?.length) {
    qualifiers.push(...lead.qualifyingParams.customQuestions);
  }

  const qualifierText =
    qualifiers.length > 0
      ? `Ask them ONE of the following qualifying questions (pick the most natural one): ${qualifiers.join(", ")}.`
      : "Ask one friendly question to understand their needs better.";

  const prompt = `You are a helpful assistant for a business. A new lead just came in from a Facebook ad.

Lead name: ${lead.name ?? "there"}
Ad name: ${lead.adName}
${lead.campaignName ? `Campaign: ${lead.campaignName}` : ""}
${lead.businessContext ? `Business context: ${lead.businessContext}` : ""}

Write a short, friendly, personalized SMS message to send to this lead. The message should:
1. Greet them by name
2. Briefly acknowledge the ad they responded to
3. ${qualifierText}
4. Be conversational and natural — not salesy
5. Be under 320 characters

Reply with ONLY the SMS message text, nothing else.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return content.text.trim();
}
