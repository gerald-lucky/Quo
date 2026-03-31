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

export interface ConversationMessage {
  role: "assistant" | "user";
  content: string;
}

export interface FollowUpResult {
  message: string;
  qualificationStatus: "pending" | "qualified" | "not_qualified";
}

function buildQualifierList(params?: QualifyingParams): string[] {
  const qualifiers: string[] = [];
  if (params?.monthlyBudget) qualifiers.push("monthly budget");
  if (params?.moveInDate) qualifiers.push("expected move-in date");
  if (params?.rentOrBuy) qualifiers.push("whether they want to rent or buy");
  if (params?.customQuestions?.length) qualifiers.push(...params.customQuestions);
  return qualifiers;
}

/**
 * Generate the first qualifying message sent to a new lead.
 */
export async function generateQualifyingMessage(lead: LeadContext): Promise<string> {
  const qualifiers = buildQualifierList(lead.qualifyingParams);

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
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  return content.text.trim();
}

/**
 * Generate a follow-up reply based on the full conversation history.
 * Returns the next message and whether the lead is now qualified.
 */
export async function generateFollowUp(
  lead: LeadContext,
  history: ConversationMessage[]
): Promise<FollowUpResult> {
  const qualifiers = buildQualifierList(lead.qualifyingParams);

  const systemPrompt = `You are a friendly sales assistant qualifying leads via SMS for a business.

Business context: ${lead.businessContext ?? "A business looking for qualified leads."}
Ad: ${lead.adName}
Lead name: ${lead.name ?? "the lead"}

Qualifying information you need to collect:
${qualifiers.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Rules:
- Ask ONE question at a time
- Be friendly, brief, and conversational
- Keep messages under 320 characters
- Once you have collected all qualifying info, send a warm closing message and end with exactly: [QUALIFIED]
- If the lead is clearly not a good fit (e.g. budget too low, not interested), end with exactly: [NOT_QUALIFIED]
- Otherwise just reply naturally and continue collecting info

Reply with ONLY the SMS message text (and optionally [QUALIFIED] or [NOT_QUALIFIED] at the very end).`;

  const messages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: systemPrompt,
    messages,
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  let text = content.text.trim();
  let qualificationStatus: FollowUpResult["qualificationStatus"] = "pending";

  if (text.includes("[QUALIFIED]")) {
    qualificationStatus = "qualified";
    text = text.replace("[QUALIFIED]", "").trim();
  } else if (text.includes("[NOT_QUALIFIED]")) {
    qualificationStatus = "not_qualified";
    text = text.replace("[NOT_QUALIFIED]", "").trim();
  }

  return { message: text, qualificationStatus };
}
