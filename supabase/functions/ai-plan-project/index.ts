// AI Project Planner - generates structured project plan from BRD text
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PlanTask {
  id: number;
  name: string;
  parentId: number | null;
  durationDays: number;
  isMilestone?: boolean;
  resourceRole?: string;
  dependencies?: { predecessorId: number; type?: "FS" | "SS" | "FF" | "SF"; lag?: number }[];
}

interface PlanResponse {
  projectName: string;
  summary: string;
  assumptions: string[];
  warnings: string[];
  resourceRoles: string[];
  tasks: PlanTask[];
}

const SYSTEM_PROMPT = `You are an expert project planner. Given a Business Requirements Document (BRD) and optional user instructions, produce a comprehensive project plan as strict JSON.

Requirements:
- Break work into a hierarchical WBS: phases (parents) containing tasks (children). Use parentId to link.
- Include at least a few milestones (isMilestone: true, durationDays: 0) at key checkpoints.
- Define reasonable dependencies between tasks using FS by default. Reference predecessor IDs that exist in your plan.
- Suggest resource roles per task (e.g. "Frontend Developer", "PM", "QA").
- Task IDs must be unique positive integers starting at 1, sequential.
- Parents come before children in the array.
- Durations are in WORKING days. Respect any max duration in the user prompt.
- Output ONLY valid JSON matching this schema:
{
  "projectName": string,
  "summary": string,
  "assumptions": string[],
  "warnings": string[],
  "resourceRoles": string[],
  "tasks": [
    { "id": number, "name": string, "parentId": number|null, "durationDays": number,
      "isMilestone": boolean, "resourceRole": string,
      "dependencies": [{ "predecessorId": number, "type": "FS"|"SS"|"FF"|"SF", "lag": number }] }
  ]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentText, prompt } = await req.json();
    if (!documentText || typeof documentText !== "string") {
      return new Response(JSON.stringify({ error: "documentText required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = documentText.slice(0, 60000);
    const userMessage = `Business Requirements Document:\n"""\n${truncated}\n"""\n\nAdditional instructions from user:\n${prompt || "(none)"}\n\nReturn ONLY the JSON plan.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      const message = aiResp.status === 429
        ? "Rate limit exceeded. Please retry shortly."
        : aiResp.status === 402
          ? "AI credits exhausted. Please add credits in your workspace."
          : `AI generation failed (${aiResp.status})`;
      return new Response(JSON.stringify({ error: message, details: errText }), {
        status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    let plan: PlanResponse;
    try {
      plan = JSON.parse(content);
    } catch (_e) {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned non-JSON response");
      plan = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Planner error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
