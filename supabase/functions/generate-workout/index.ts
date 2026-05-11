import { callGemini, corsHeaders, json, sanitizeInput } from "../_shared/gemini.ts";
import { AdaptiveMemory, ExerciseMeta, chooseExercises, estimateSessionMinutes, inferFocus, canonicalName, shouldDebugAdaptive } from "../_shared/adaptive.ts";

type RawPlan = {
  rationale?: string;
  exercises?: { name?: string; sets?: number; reps?: string; form_cue?: string }[];
};

function clamp(v: unknown, min: number, max: number, def: number): number {
  const n = Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function timeRules(time: number) {
  if (time <= 20) return { maxExercises: 4, minDuration: 15, maxDuration: 20, label: "< 20 min" };
  if (time <= 35) return { maxExercises: 5, minDuration: 25, maxDuration: 35, label: "30 min" };
  if (time <= 50) return { maxExercises: 6, minDuration: 40, maxDuration: 50, label: "45 min" };
  return { maxExercises: 7, minDuration: 55, maxDuration: 70, label: "60+ min" };
}

function setsReps(sets: number, reps: string) {
  return `${sets} sets - ${sanitizeInput(reps, 30)} reps`;
}

function fallbackFromDeterministic(
  focus: string,
  picked: ExerciseMeta[],
  rules: ReturnType<typeof timeRules>,
  sleep: number,
  energy: number,
  soreness: number,
) {
  const lowReadiness = sleep < 6 || energy <= 4 || soreness >= 7;
  const sets = lowReadiness ? 2 : 3;
  const reps = lowReadiness ? "10-12" : "8-10";
  const setsScheme = picked.map(() => sets);
  const estimated = estimateSessionMinutes(picked, setsScheme);
  return {
    focus,
    duration: clamp(estimated, rules.minDuration, rules.maxDuration, rules.maxDuration),
    rationale: lowReadiness
      ? `Built around ${focus} with reduced joint stress and fatigue to match your readiness.`
      : `Built around ${focus} with balanced movement patterns for your selected time window.`,
    exercises: picked.map((e, i) => ({
      id: `d${i + 1}`,
      name: e.name,
      setsReps: setsReps(sets, reps),
      cue: undefined,
      primaryMuscle: e.primaryMuscle,
      movementPattern: e.movementPattern,
      estimatedTimeSec: e.estimatedTimeSec,
      fatigueCost: e.fatigueCost,
    })),
    reasoning: {
      summary: lowReadiness
        ? "Adjusted intensity down for readiness while preserving training intent."
        : "Balanced movement patterns for the selected focus and duration.",
      selection: [
        "Selected exercises by deterministic scoring (focus, movement pattern, variety, equipment).",
      ],
      constraints: [
        `Duration constrained to ${rules.minDuration}-${rules.maxDuration} minutes.`,
        `Exercise count capped at ${rules.maxExercises}.`,
      ],
      adaptations: lowReadiness
        ? ["Reduced fatigue load due to low readiness markers."]
        : ["Kept normal training load because readiness was adequate."],
    },
  };
}

function buildPrompt(params: {
  focus: string;
  rules: ReturnType<typeof timeRules>;
  ranked: { name: string; score: number }[];
  chosenNames: string[];
  sleep: number;
  energy: number;
  soreness: number;
  note: string;
}) {
  const rankedText = params.ranked.map((r) => `- ${r.name} (score ${r.score})`).join("\n");
  const chosenText = params.chosenNames.map((n) => `- ${n}`).join("\n");
  return `ABSOLUTE RULES - FOLLOW FIRST:
1. Today's workout focus is ${params.focus}. You MUST NOT change the focus.
2. duration_minutes must be ${params.rules.minDuration}-${params.rules.maxDuration}.
3. Use exactly these selected exercises and preserve their order intent:
${chosenText}
4. Do not add or replace exercises outside the selected list.
5. Keep total exercises <= ${params.rules.maxExercises}.

Ranked candidate context (already filtered/scored by backend):
${rankedText}

Readiness context:
- Sleep: ${params.sleep} hours
- Energy: ${params.energy}/10
- Soreness: ${params.soreness}/10
- Note: ${params.note || "none"}

Output only valid JSON:
{
  "rationale": "One calm sentence.",
  "exercises": [
    {
      "name": "Exact exercise name from selected list",
      "sets": 3,
      "reps": "8-10",
      "form_cue": "Optional one-line cue"
    }
  ]
}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let fallbackFocus = "Push";
  let fallbackRules = timeRules(45);
  let fallbackDet: ReturnType<typeof fallbackFromDeterministic> | null = null;

  try {
    const body = await req.json();
    const sleep = clamp(body.sleep, 0, 12, 7);
    const energy = clamp(body.energy, 1, 10, 6);
    const soreness = clamp(body.soreness, 0, 10, 3);
    const time = clamp(body.time, 15, 90, 45);
    const note = typeof body.note === "string" ? sanitizeInput(body.note, 300) : "";
    const equipmentContext = sanitizeInput(String(body.equipment ?? "Full Gym"), 60);
    const recentExercises = Array.isArray(body.recentExercises)
      ? body.recentExercises.slice(0, 60).map((x: unknown) => sanitizeInput(String(x), 120))
      : [];
    const adaptiveMemory: AdaptiveMemory = typeof body.adaptiveMemory === "object" && body.adaptiveMemory
      ? body.adaptiveMemory as AdaptiveMemory
      : {};

    const focus = inferFocus(String(body.focus ?? "Push"));
    const rules = timeRules(time);
    fallbackFocus = focus;
    fallbackRules = rules;
    const rankedResult = chooseExercises({
      focus,
      maxExercises: rules.maxExercises,
      sleep,
      energy,
      soreness,
      note,
      recentExercises,
      equipmentContext,
      memory: adaptiveMemory,
    });
    const picked = rankedResult.picked.slice(0, rules.maxExercises);
    if (!picked.length) throw new Error("No deterministic exercises available");
    fallbackDet = fallbackFromDeterministic(focus, picked, rules, sleep, energy, soreness);

    const chosenNames = picked.map((e) => e.name);
    const allowedSet = new Set(chosenNames.map(canonicalName));
    const raw = (await callGemini(
      buildPrompt({
        focus,
        rules,
        ranked: rankedResult.ranked.map((r) => ({ name: r.ex.name, score: Math.round(r.score) })),
        chosenNames,
        sleep,
        energy,
        soreness,
        note,
      }),
    )) as RawPlan;

    const lowReadiness = sleep < 6 || energy <= 4 || soreness >= 7;
    const defaultSets = lowReadiness ? 2 : 3;
    const defaultReps = lowReadiness ? "10-12" : "8-10";

    const cueByName = new Map<string, { sets: number; reps: string; cue?: string }>();
    for (const e of raw.exercises ?? []) {
      const nm = sanitizeInput(String(e.name ?? ""), 100);
      if (!nm || !allowedSet.has(canonicalName(nm))) continue;
      if (cueByName.has(canonicalName(nm))) continue;
      cueByName.set(canonicalName(nm), {
        sets: clamp(e.sets, 2, 4, defaultSets),
        reps: sanitizeInput(e.reps ?? defaultReps, 30),
        cue: e.form_cue ? sanitizeInput(e.form_cue, 160) : undefined,
      });
    }

    const exercises = picked.map((ex, i) => {
      const k = canonicalName(ex.name);
      const plan = cueByName.get(k) ?? { sets: defaultSets, reps: defaultReps, cue: undefined };
      return {
        id: `g${i + 1}`,
        name: ex.name,
        setsReps: setsReps(plan.sets, plan.reps),
        cue: plan.cue,
      };
    });

    const est = estimateSessionMinutes(
      picked,
      exercises.map((e) => clamp(Number(e.setsReps.split(" ")[0]), 2, 4, defaultSets)),
    );
    const duration = clamp(est, rules.minDuration, rules.maxDuration, rules.maxDuration);
    const reasoning = {
      summary: lowReadiness
        ? "Reduced fatigue load due to readiness signals while preserving workout identity."
        : "Built a balanced session aligned to focus, time, and recent history.",
      selection: [
        "Ranked exercises by focus fit, movement-pattern balance, and variety pressure.",
        "Protected against duplicate movement patterns in the same session.",
      ],
      constraints: [
        `Hard duration band applied: ${rules.minDuration}-${rules.maxDuration} minutes.`,
        `Hard max exercise count applied: ${rules.maxExercises}.`,
      ],
      adaptations: [
        lowReadiness
          ? "Reduced high-fatigue/high-joint-stress choices due to low sleep/energy or high soreness."
          : "Maintained normal fatigue profile because readiness was sufficient.",
        recentExercises.length
          ? "Applied repetition penalties using recent exercise history."
          : "No repetition penalty applied (no history available).",
      ],
    };

    return json({
      focus,
      duration,
      rationale: sanitizeInput(
        raw.rationale ??
          (lowReadiness
            ? `Reduced fatigue and joint stress while preserving ${focus} training intent.`
            : `Balanced movement patterns and stimulus for your ${focus} session.`),
        240,
      ),
      exercises: exercises.map((e, i) => ({
        ...e,
        primaryMuscle: picked[i]?.primaryMuscle,
        movementPattern: picked[i]?.movementPattern,
        estimatedTimeSec: picked[i]?.estimatedTimeSec,
        fatigueCost: picked[i]?.fatigueCost,
      })),
      reasoning,
      progression: {
        movementCoverage: picked.reduce<Record<string, number>>((acc, ex) => {
          acc[ex.movementPattern] = (acc[ex.movementPattern] ?? 0) + 1;
          return acc;
        }, {}),
      },
      debug: shouldDebugAdaptive()
        ? {
            scoring: rankedResult.debug.scoring,
            rejected: rankedResult.debug.rejected,
            durationEstimate: { estimatedMinutes: est, clampedMinutes: duration, rules },
            readiness: { sleep, energy, soreness, lowReadiness },
            penalties: { repetitionHistoryCount: recentExercises.length },
          }
        : undefined,
    });
  } catch {
    if (fallbackDet) return json(fallbackDet);
    return json({
      focus: fallbackFocus,
      duration: fallbackRules.maxDuration,
      rationale: `Could not run full adaptation pipeline, returned a constrained ${fallbackFocus} session.`,
      exercises: [],
    }, 500);
  }
});
