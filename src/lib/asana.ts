const ASANA_API = "https://app.asana.com/api/1.0";

export interface AsanaTaskInput {
  leadName: string;
  phone: string;
  callbackTime?: string; // "YYYY-MM-DD HH:MM"
  adName?: string;
}

export interface AsanaTaskResult {
  success: boolean;
  taskId?: string;
  taskUrl?: string;
  error?: string;
}

/**
 * Create an Asana task for a qualified lead callback.
 */
export async function createCallbackTask(input: AsanaTaskInput): Promise<AsanaTaskResult> {
  const token = process.env.ASANA_PAT;
  const projectId = process.env.ASANA_PROJECT_ID;

  if (!token || !projectId) {
    return { success: false, error: "ASANA_PAT or ASANA_PROJECT_ID not configured" };
  }

  // Build due date string (YYYY-MM-DD only — Asana uses date, not datetime)
  let dueOn: string | undefined;
  if (input.callbackTime) {
    dueOn = input.callbackTime.split(" ")[0]; // extract YYYY-MM-DD
  }

  const taskName = `Call ${input.leadName} — ${input.phone}`;
  const notes = [
    `Lead: ${input.leadName}`,
    `Phone: ${input.phone}`,
    input.adName ? `Ad: ${input.adName}` : null,
    input.callbackTime ? `Callback time: ${input.callbackTime}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const body: Record<string, unknown> = {
    data: {
      name: taskName,
      notes,
      projects: [projectId],
      ...(dueOn ? { due_on: dueOn } : {}),
    },
  };

  try {
    const res = await fetch(`${ASANA_API}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as { data?: { gid?: string }; errors?: { message: string }[] };

    if (!res.ok) {
      const errMsg = data.errors?.[0]?.message ?? `HTTP ${res.status}`;
      console.error("[Asana] Task creation failed:", errMsg);
      return { success: false, error: errMsg };
    }

    const taskId = data.data?.gid;
    const taskUrl = taskId ? `https://app.asana.com/0/${projectId}/${taskId}` : undefined;

    console.log(`[Asana] Task created: ${taskName} (${taskId})`);
    return { success: true, taskId, taskUrl };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[Asana] Error:", error);
    return { success: false, error };
  }
}
