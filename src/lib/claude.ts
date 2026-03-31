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

export type QualificationStatus = "pending" | "qualified" | "not_qualified" | "awaiting_callback";

export interface FollowUpResult {
  message: string;
  qualificationStatus: QualificationStatus;
  callbackTime?: string;
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

  const prompt = `You are Gerald from Lucky Communities, a friendly real estate professional. A new lead just came in from a Facebook ad.

Lead name: ${lead.name ?? "there"}
Ad name: ${lead.adName}
${lead.campaignName ? `Campaign: ${lead.campaignName}` : ""}
${lead.businessContext ? `Business context: ${lead.businessContext}` : ""}

Write a short, friendly, personalized SMS message to send to this lead. The message should:
1. Introduce yourself as "Gerald from Lucky Communities"
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
 * Returns the next message, qualification status, and optional callback time.
 */
export async function generateFollowUp(
  lead: LeadContext,
  history: ConversationMessage[],
  currentStatus?: QualificationStatus
): Promise<FollowUpResult> {
  const qualifiers = buildQualifierList(lead.qualifyingParams);

  // If lead is awaiting_callback, parse the callback time from their reply
  if (currentStatus === "awaiting_callback") {
    const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      return await parseCallbackTime(lead, history, lastUserMessage.content);
    }
  }

  const systemPrompt = `You are Gerald from Lucky Communities, a friendly real estate professional qualifying leads via SMS.

Business context: ${lead.businessContext ?? "Lucky Communities — real estate."}
Ad: ${lead.adName}
Lead name: ${lead.name ?? "the lead"}

Qualifying information you need to collect:
${qualifiers.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Rules:
- Always communicate as Gerald from Lucky Communities
- Ask ONE question at a time
- Be friendly, brief, and conversational
- Keep messages under 320 characters
- Once you have collected all qualifying info, the lead is qualified. Send a warm message saying you'd love to connect and end with exactly: [QUALIFIED]
- If the lead is clearly not a good fit (e.g. budget too low, not interested), send a polite closing message and end with exactly: [NOT_QUALIFIED]
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
  let qualificationStatus: QualificationStatus = "pending";

  if (text.includes("[QUALIFIED]")) {
    qualificationStatus = "awaiting_callback";
    text = text.replace("[QUALIFIED]", "").trim();
    // Append the callback ask
    const callbackAsk = await generateCallbackAsk(lead);
    text = callbackAsk;
  } else if (text.includes("[NOT_QUALIFIED]")) {
    qualificationStatus = "not_qualified";
    text = text.replace("[NOT_QUALIFIED]", "").trim();
  }

  return { message: text, qualificationStatus };
}

/**
 * Generate the "When can I give you a call?" message for qualified leads.
 */
async function generateCallbackAsk(lead: LeadContext): Promise<string> {
  const prompt = `You are Gerald from Lucky Communities. A lead has just been qualified and you want to schedule a call with them.

Lead name: ${lead.name ?? "there"}

Write a short, warm SMS asking when you can give them a call. Keep it under 160 characters. Be friendly and personal — sign off as Gerald.

Reply with ONLY the SMS message text.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  return content.text.trim();
}

/**
 * Generate a follow-up nudge when a lead hasn't responded.
 * followUpNumber: 1, 2, or 3
 */
export async function generateFollowUpNudge(
  lead: LeadContext,
  followUpNumber: number
): Promise<string> {
  const tone =
    followUpNumber === 1
      ? "a gentle, friendly check-in"
      : followUpNumber === 2
      ? "a slightly more direct but still warm nudge"
      : "a final, brief message letting them know you'll stop reaching out";

  const prompt = `You are Gerald from Lucky Communities. You sent a lead a message a while ago and haven't heard back. This is follow-up number ${followUpNumber} of 3.

Lead name: ${lead.name ?? "there"}
Ad: ${lead.adName}
${lead.businessContext ? `Business context: ${lead.businessContext}` : ""}

Write ${tone} as a short SMS. Keep it under 160 characters. Be genuine — not pushy. Sign off as Gerald.${followUpNumber === 3 ? " Make it clear this is your last follow-up." : ""}

Reply with ONLY the SMS message text.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  return content.text.trim();
}

/**
 * Parse a callback time from the lead's reply and confirm the appointment.
 */
async function parseCallbackTime(
  lead: LeadContext,
  history: ConversationMessage[],
  userReply: string
): Promise<FollowUpResult> {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `A lead replied with their preferred callback time. Extract the date and time from their message.

Today's date: ${today}
Lead's message: "${userReply}"

Respond in this exact JSON format (no other text):
{
  "callbackTime": "YYYY-MM-DD HH:MM",
  "readable": "human readable version like 'Tuesday, April 2nd at 3pm'",
  "confirmed": true
}

If you cannot determine a specific date/time, set confirmed to false and callbackTime to null.`;

  const parseResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const parseContent = parseResponse.content[0];
  if (parseContent.type !== "text") throw new Error("Unexpected response type from Claude");

  let callbackTime: string | undefined;
  let readableTime: string = userReply;

  try {
    const parsed = JSON.parse(parseContent.text.trim());
    if (parsed.confirmed && parsed.callbackTime) {
      callbackTime = parsed.callbackTime;
      readableTime = parsed.readable ?? userReply;
    }
  } catch {
    // Could not parse JSON — fall through with undefined callbackTime
  }

  // Generate confirmation message
  const confirmPrompt = `You are Gerald from Lucky Communities. A lead just told you their preferred callback time: "${userReply}".

${callbackTime ? `Confirmed time: ${readableTime}` : "The time was a bit unclear."}

Write a short, warm SMS confirming you'll call them${callbackTime ? ` on ${readableTime}` : " at the time they mentioned"}. Keep it under 160 characters. Be friendly — you're Gerald from Lucky Communities.

Reply with ONLY the SMS message text.`;

  const confirmResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: confirmPrompt }],
  });

  const confirmContent = confirmResponse.content[0];
  if (confirmContent.type !== "text") throw new Error("Unexpected response type from Claude");

  return {
    message: confirmContent.text.trim(),
    qualificationStatus: "qualified",
    callbackTime,
  };
}
