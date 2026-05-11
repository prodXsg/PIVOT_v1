import { callGemini, corsHeaders, json } from "../_shared/gemini.ts";

const SYSTEM_PROMPT = `You are Pivot, an adaptive fitness coach. Generate a calm, scannable weekly summary based on the past 7 days of training data provided below.

PAST 7 DAYS DATA:
- Workouts planned: {PLANNED}
- Workouts completed: {COMPLETED}
- Total training time: {MINUTES} minutes
- Average sleep: {SLEEP} hours
- Pivots taken: {PIVOTS}
{NOTES_LINE}
OUTPUT FORMAT (return ONLY valid JSON, no markdown):
{
  "summary_paragraph": "One paragraph (3-4 sentences). Reference the actual numbers. Identify one specific pattern or insight. End with what to focus on next week.",
  "stats": [
    {"label": "Workouts completed", "value": "{COMPLETED}/{PLANNED}"},
    {"label": "Total training time", "value": "{MINUTES} min"},
    {"label": "Avg sleep", "value": "{SLEEP} hrs"},
    {"label": "Pivots taken", "value": "{PIVOTS}"}
  ],
  "focus_next_week": "One sentence on what to prioritize next week."
}

VOICE:
- Calm, direct, observational
- Reference actual numbers from the data
- Identify patterns, don't just list facts
- Never patronize or use motivational fluff`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const fallback = {
    range: "Apr 22 – Apr 28",
    summary:
      "You completed 3 of 4 planned workouts this week. The skipped session followed a 4-hour sleep night — a clear signal that sleep under 6h tanks training. Bench progressed from 67.5kg to 70kg. Next week, protect sleep on training nights.",
    stats: [
      { label: "Workouts completed", value: "3/4" },
      { label: "Total training time", value: "142 min" },
      { label: "Avg sleep", value: "6.2 hrs" },
      { label: "Pivots taken", value: "2" },
    ],
  };

  try {
    let weekData: { range?: string; workoutsPlanned?: number; workoutsCompleted?: number; totalMinutes?: number; avgSleepHours?: number; pivotsTaken?: number; notes?: string } = {};
    try { weekData = await req.json(); } catch { /* empty body */ }

    const planned = String(weekData.workoutsPlanned ?? 4);
    const completed = String(weekData.workoutsCompleted ?? 3);
    const minutes = String(weekData.totalMinutes ?? 142);
    const sleep = String(weekData.avgSleepHours ?? 6.2);
    const pivots = String(weekData.pivotsTaken ?? 2);
    const notesLine = weekData.notes ? `- Notes: ${weekData.notes}\n` : "";

    const prompt = SYSTEM_PROMPT
      .replaceAll("{PLANNED}", planned)
      .replaceAll("{COMPLETED}", completed)
      .replaceAll("{MINUTES}", minutes)
      .replaceAll("{SLEEP}", sleep)
      .replaceAll("{PIVOTS}", pivots)
      .replace("{NOTES_LINE}", notesLine);

    const raw = await callGemini(prompt) as { summary_paragraph: string; stats: { label: string; value: string }[]; focus_next_week?: string };

    const summary = raw.focus_next_week
      ? `${raw.summary_paragraph} ${raw.focus_next_week}`
      : raw.summary_paragraph;

    return json({
      range: weekData.range ?? fallback.range,
      summary,
      stats: raw.stats,
    });
  } catch {
    return json(fallback);
  }
});
