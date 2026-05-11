import { callGemini, corsHeaders, json, sanitizeInput } from "../_shared/gemini.ts";

const SYSTEM_PROMPT = `You are Pivot. The user is returning after several days away.

Generate a safe re-entry workout:
- First 1-3 sessions back: about 70% usual loads, lower volume, controlled tempo.
- Avoid max-effort work.
- Focus on movement quality and confidence.
- Duration should be 30-40 minutes.
- Use 4-5 exercises.

Output only valid JSON:
{
  "rationale": "One calm sentence explaining why this is a re-entry session.",
  "workout_focus": "Upper Push Deload",
  "duration_minutes": 35,
  "exercises": [
    {
      "name": "Exercise name",
      "sets": 3,
      "reps": "8-10",
      "weight_note": "70% of usual",
      "muscle_group": "chest",
      "is_compound": true,
      "form_cue": "Optional cue"
    }
  ]
}`;

type RawEx = { name: string; sets?: number; reps?: string; form_cue?: string; weight_note?: string };
type RawOut = { rationale: string; workout_focus: string; duration_minutes: number; exercises: RawEx[] };

function normalize(raw: RawOut) {
  return {
    focus: sanitizeInput(raw.workout_focus || "Upper Push Deload", 80),
    duration: Math.min(40, Math.max(30, Number(raw.duration_minutes) || 35)),
    rationale: sanitizeInput(raw.rationale || "A lighter re-entry session helps you rebuild rhythm without forcing intensity.", 240),
    exercises: (raw.exercises || []).slice(0, 5).map((e, i) => ({
      id: `r${i + 1}`,
      name: sanitizeInput(String(e.name ?? "Exercise"), 100),
      setsReps: `${e.sets ?? 3} sets - ${sanitizeInput(e.reps ?? "8-10", 30)} reps${e.weight_note ? ` - ${sanitizeInput(e.weight_note, 60)}` : ""}`,
      cue: e.form_cue ? sanitizeInput(e.form_cue, 160) : undefined,
    })),
  };
}

const fallback = {
  focus: "Upper Push Deload",
  duration: 35,
  rationale: "A lighter re-entry session helps you rebuild rhythm without forcing intensity.",
  exercises: [
    { id: "rf1", name: "Machine Chest Press", setsReps: "3 sets - 8 reps - 70% of usual", cue: "Move with control." },
    { id: "rf2", name: "Seated Dumbbell Shoulder Press", setsReps: "2 sets - 8 reps - light" },
    { id: "rf3", name: "Cable Lateral Raise", setsReps: "2 sets - 12 reps" },
    { id: "rf4", name: "Triceps Rope Pushdown", setsReps: "2 sets - 12 reps" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const result = (await callGemini(SYSTEM_PROMPT)) as RawOut;
    const workout = normalize(result);
    return json(workout.exercises.length ? workout : fallback);
  } catch {
    return json(fallback);
  }
});
